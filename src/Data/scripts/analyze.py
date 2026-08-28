import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit

# ------------------------------------------------------------
# LOAD DATA
# ------------------------------------------------------------
production = pd.read_csv(r'C:\Users\User\Desktop\Estacado Acquisition\Estacado Acquisition\production.csv')
site_map = pd.read_csv(r'C:\Users\User\Desktop\Estacado Acquisition\Estacado Acquisition\well_site_map.csv')

production.columns = production.columns.str.strip()
site_map.columns = site_map.columns.str.strip()
site_map['Site Code'] = site_map['Site Code'].str.upper()

merged = pd.merge(production, site_map, on='Well ID', how='left')

# ------------------------------------------------------------
# REMOVE SHUT_IN DAYS (do this BEFORE date filtering, BOE, top 5)
# ------------------------------------------------------------
if 'Status' in merged.columns:
    merged = merged[merged['Status'].str.upper() != 'SHUT_IN']

# ------------------------------------------------------------
# DATE CLEANING
# ------------------------------------------------------------

DATE_MIN = pd.Timestamp("2025-08-27")
DATE_MAX = pd.Timestamp("2026-08-26")


def normalize_datetime(x):

    x = str(x).strip()

    # Normalize separators
    x = x.replace("-", "/")

    # First try standard US interpretation: MM/DD/YYYY
    try:
        date = pd.to_datetime(
            x,
            format="mixed",
            dayfirst=False,
            errors="coerce"
        )
    except Exception:
        date = pd.NaT

    # If the date is valid AND inside our expected range,
    # keep it exactly as parsed
    if pd.notna(date) and DATE_MIN <= date <= DATE_MAX:
        return date

    # --------------------------------------------------------
    # Date is outside expected range.
    # Try switching month and day.
    # --------------------------------------------------------

    try:
        parts = x.split("/")

        if len(parts) >= 3:

            month = parts[0]
            day = parts[1]
            year = parts[2]

            # Swap month and day
            swapped = f"{day}/{month}/{year}"

            swapped_date = pd.to_datetime(
                swapped,
                format="mixed",
                dayfirst=False,
                errors="coerce"
            )

            # Only use swapped version if it falls
            # inside the known valid range
            if (
                pd.notna(swapped_date)
                and DATE_MIN <= swapped_date <= DATE_MAX
            ):
                return swapped_date

    except Exception:
        pass

    # Neither interpretation produced a valid date
    return pd.NaT


# Apply date correction
merged["Datetime"] = merged["Datetime"].apply(normalize_datetime)


# ------------------------------------------------------------
# SHOW DATES THAT COULD NOT BE FIXED
# ------------------------------------------------------------

bad_dates = merged[merged["Datetime"].isna()]

if len(bad_dates) > 0:
    print("\nWARNING: Dates that could not be interpreted:")
    print(bad_dates[["Well ID", "Datetime"]])


# Remove rows whose date genuinely cannot be determined
merged = merged.dropna(subset=["Datetime"])


# ------------------------------------------------------------
# VERIFY FINAL DATE RANGE
# ------------------------------------------------------------

print("\nFinal date range:")
print("Earliest:", merged["Datetime"].min())
print("Latest:  ", merged["Datetime"].max())

print("\nLatest 10 observations:")
print(
    merged[["Well ID", "Datetime"]]
    .sort_values("Datetime")
    .tail(10)
)
# ------------------------------------------------------------
# CREATE LAST 6 MONTHS SUBSET
# ------------------------------------------------------------
today = pd.Timestamp("2026-08-27")
cutoff = today - pd.DateOffset(months=6)

merged_6mo = merged[merged['Datetime'] >= cutoff].copy()

# ------------------------------------------------------------
# UNIT CLEANING
# ------------------------------------------------------------
def convert_m3_to_bbl(x):
    x = str(x).lower().strip()
    if "m3" in x:
        return float(x.replace("m3", "").strip()) * 6.2898
    return float(x)

def clean_gas_value(x):
    x = str(x).lower().strip()
    if x.endswith("mcf"):
        return float(x.replace("mcf", "").strip())
    if x.endswith("mmbtu"):
        return float(x.replace("mmbtu", "").strip()) * 0.963
    return float(x)

# Clean full dataset
merged['Allocation Oil Volume'] = merged['Allocation Oil Volume'].apply(convert_m3_to_bbl)
merged['Allocation Gas Volume'] = merged['Allocation Gas Volume'].apply(clean_gas_value)

# Clean 6-month subset
merged_6mo['Allocation Oil Volume'] = merged_6mo['Allocation Oil Volume'].apply(convert_m3_to_bbl)
merged_6mo['Allocation Gas Volume'] = merged_6mo['Allocation Gas Volume'].apply(clean_gas_value)

# ------------------------------------------------------------
# DAILY BOE
# ------------------------------------------------------------
merged['BOE'] = merged['Allocation Oil Volume'] + (merged['Allocation Gas Volume'] / 6)
merged_6mo['BOE'] = merged_6mo['Allocation Oil Volume'] + (merged_6mo['Allocation Gas Volume'] / 6)

# ------------------------------------------------------------
# TOP 5 WELLS BASED ON LAST 6 MONTHS ONLY
# ------------------------------------------------------------
boe_by_well_6mo = merged_6mo.groupby('Well ID')['BOE'].sum().reset_index()
top5_wells = boe_by_well_6mo.sort_values('BOE', ascending=False).head(5)
top_ids = top5_wells['Well ID'].tolist()

# Pull FULL HISTORY for those wells
top_prod_full = merged[merged['Well ID'].isin(top_ids)].copy()

# ------------------------------------------------------------
# DECLINE MODEL (HYPERBOLIC WITH BOUNDS)
# ------------------------------------------------------------
def hyperbolic_arps(t, qi, Di, b):
    return qi / (1 + b * Di * t) ** (1 / b)

def exponential_arps(t, qi, Di):
    return qi * np.exp(-Di * t)

models = {}

for wid, df in top_prod_full.groupby('Well ID'):
    df = df.sort_values('Datetime').copy()

    # Smooth data only to identify a stable production peak
    df['BOE_smooth'] = df['BOE'].rolling(
        window=14,
        center=True,
        min_periods=1
    ).mean()

    peak_idx = df['BOE_smooth'].idxmax()
    df_fit = df.loc[peak_idx:].copy()

    t = (
        df_fit['Datetime'] - df_fit['Datetime'].iloc[0]
    ).dt.days.values / 365.25

    q = df_fit['BOE'].values

    if len(q) < 20:
        print(f"Skipping {wid}: not enough data")
        continue

    try:
        # Hyperbolic fit
        hyp_params, _ = curve_fit(
            hyperbolic_arps,
            t,
            q,
            p0=[max(q[0], 0.1), 0.2, 0.8],
            bounds=(
                [0.1, 0.001, 0.01],
                [5000, 3.0, 2.0]
            ),
            maxfev=50000
        )

        qi_h, Di_h, b_h = hyp_params

        q_hyp = hyperbolic_arps(
            t,
            qi_h,
            Di_h,
            b_h
        )

        rmse_hyp = np.sqrt(
            np.mean((q - q_hyp) ** 2)
        )

        # Exponential fit
        exp_params, _ = curve_fit(
            exponential_arps,
            t,
            q,
            p0=[max(q[0], 0.1), 0.2],
            bounds=(
                [0.1, 0.001],
                [5000, 3.0]
            ),
            maxfev=50000
        )

        qi_e, Di_e = exp_params

        q_exp = exponential_arps(
            t,
            qi_e,
            Di_e
        )

        rmse_exp = np.sqrt(
            np.mean((q - q_exp) ** 2)
        )

        # Save hyperbolic model for later forecasting
        models[wid] = (
            df_fit['Datetime'].iloc[0],
            qi_h,
            Di_h,
            b_h
        )

        print(
            f"{wid} | "
            f"qi={qi_h:.3f} | "
            f"Di={Di_h:.4f} | "
            f"b={b_h:.4f} | "
            f"Hyper RMSE={rmse_hyp:.2f} | "
            f"Exp RMSE={rmse_exp:.2f} | "
            f"Start={df_fit['Datetime'].iloc[0].date()}"
        )

    except Exception as e:
        print(f"Could not fit {wid}: {e}")
# ------------------------------------------------------------
# FORECAST 5 YEARS
# ------------------------------------------------------------
forecast_list = []

for wid, (t0_date, qi, Di, b) in models.items():
    forecast_months = pd.date_range(start=t0_date, periods=5 * 12 + 1, freq='MS')
    t_forecast = (forecast_months - t0_date).days / 365.25

    q_forecast = hyperbolic_arps(t_forecast, qi, Di, b)

    df_f = pd.DataFrame({
        'Well ID': wid,
        'Date': forecast_months,
        'Rate_BOE_per_day': q_forecast
    })

    df_f['Days'] = df_f['Date'].dt.days_in_month
    df_f['Volume_BOE'] = df_f['Rate_BOE_per_day'] * df_f['Days']

    forecast_list.append(df_f)

forecast_all = pd.concat(forecast_list, ignore_index=True)


# ------------------------------------------------------------
# PLOT CURVES
# ------------------------------------------------------------
plt.figure(figsize=(12,7))

for wid in top_ids:
    df_hist = top_prod_full[top_prod_full['Well ID'] == wid].sort_values('Datetime')
    df_fore = forecast_all[forecast_all['Well ID'] == wid]

    plt.scatter(df_hist['Datetime'], df_hist['BOE'], s=20, alpha=0.5, label=f"{wid} Historical")
    plt.plot(df_fore['Date'], df_fore['Rate_BOE_per_day'], linewidth=2, label=f"{wid} Forecast")

plt.title("Hyperbolic Decline Curves — Top 5 Wells (Daily Data, Last 6 Months Ranking)")
plt.xlabel("Date")
plt.ylabel("BOE/day")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.show()
