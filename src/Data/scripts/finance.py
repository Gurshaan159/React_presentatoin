import json
from pathlib import Path

import pandas as pd
import numpy as np
from scipy.optimize import curve_fit

try:
    import matplotlib.pyplot as plt
    HAVE_PLT = True
except ImportError:  # plotting is optional; the JSON export is what the app uses
    HAVE_PLT = False


# ============================================================
# LOAD DATA  (raw, unfiltered files — not the cleaned/ folder)
# ============================================================

DATA_DIR = Path(__file__).resolve().parents[1]          # .../src/Data
OUT_PATH = DATA_DIR / 'q4_well_economics.json'

production = pd.read_csv(DATA_DIR / 'production.csv')

finance = pd.read_json(DATA_DIR / 'financial_estacado.json')


# ============================================================
# FLATTEN FINANCE JSON
# ============================================================

finance_records = pd.json_normalize(finance["records"])

finance_clean = pd.concat(
    [
        finance.drop(columns=["records"]).reset_index(drop=True),
        finance_records.reset_index(drop=True)
    ],
    axis=1
)


# ============================================================
# CLEAN FINANCE NUMERIC COLUMNS
# ============================================================

numeric_cols = [
    "revenue",
    "operatingCost",
    "profit",
    "costPerBarrel"
]

for col in numeric_cols:
    original = finance_clean[col].copy()

    finance_clean[col] = (
        finance_clean[col]
        .astype(str)
        .str.replace("USD", "", regex=False)
        .str.replace("$", "", regex=False)
        .str.replace(",", "", regex=False)
        .str.strip()
    )

    finance_clean[col] = pd.to_numeric(
        finance_clean[col],
        errors="coerce"
    )

    failed = original[
        finance_clean[col].isna()
        & original.notna()
    ]

    print(f"{col}: {len(failed)} values failed numeric conversion")


print("\nFinance numeric dtypes:")
print(finance_clean[numeric_cols].dtypes)

print("\nMissing numeric values after conversion:")
print(finance_clean[numeric_cols].isna().sum())

# ============================================================
# RECALCULATE PROFIT
# ============================================================

finance_clean["profit"] = (
    finance_clean["revenue"]
    - finance_clean["operatingCost"]
)

# ============================================================
# CLEAN FINANCE DATES
# ============================================================

finance_clean["period"] = pd.to_datetime(
    finance_clean["period"],
    format="mixed",
    dayfirst=True,
    errors="coerce"
)


# ============================================================
# NORMALIZE FINANCE WELL IDS
# ============================================================

finance_clean["wellId"] = (
    finance_clean["wellId"]
    .astype(str)
    .str.strip()
    .str.extract(r"(\d+)", expand=False)
)

finance_clean = finance_clean.dropna(
    subset=["wellId"]
).copy()

finance_clean["wellId"] = (
    finance_clean["wellId"]
    .astype(int)
    .map(lambda x: f"W{x:04d}")
)


# ============================================================
# CLEAN PRODUCTION DATES
# ============================================================

DATE_MIN = pd.Timestamp("2025-08-27")
DATE_MAX = pd.Timestamp("2026-08-26")


def normalize_datetime(x):
    x = str(x).strip()
    x = x.replace("-", "/")

    try:
        date = pd.to_datetime(
            x,
            format="mixed",
            dayfirst=False,
            errors="coerce"
        )
    except Exception:
        date = pd.NaT

    if pd.notna(date) and DATE_MIN <= date <= DATE_MAX:
        return date

    try:
        parts = x.split("/")

        if len(parts) >= 3:
            month = parts[0]
            day = parts[1]
            year = parts[2]

            swapped = f"{day}/{month}/{year}"

            swapped_date = pd.to_datetime(
                swapped,
                format="mixed",
                dayfirst=False,
                errors="coerce"
            )

            if (
                pd.notna(swapped_date)
                and DATE_MIN <= swapped_date <= DATE_MAX
            ):
                return swapped_date

    except Exception:
        pass

    return pd.NaT


production["Datetime"] = (
    production["Datetime"]
    .apply(normalize_datetime)
)


# ============================================================
# REMOVE BAD PRODUCTION DATES
# ============================================================

bad_dates = production[
    production["Datetime"].isna()
]

if len(bad_dates) > 0:
    print("\nWARNING: Dates that could not be interpreted:")
    print(
        bad_dates[
            ["Well ID", "Datetime"]
        ]
    )

production = production.dropna(
    subset=["Datetime"]
).copy()


# ============================================================
# VERIFY PRODUCTION DATE RANGE
# ============================================================

print("\nFinal date range:")
print("Earliest:", production["Datetime"].min())
print("Latest:  ", production["Datetime"].max())


# ============================================================
# NORMALIZE PRODUCTION WELL IDS
# ============================================================

production["Well_ID_Normalized"] = (
    production["Well ID"]
    .astype(str)
    .str.strip()
    .str.extract(r"(\d+)", expand=False)
)

production = production.dropna(
    subset=["Well_ID_Normalized"]
).copy()

production["Well_ID_Normalized"] = (
    production["Well_ID_Normalized"]
    .astype(int)
    .map(lambda x: f"W{x:04d}")
)


# ============================================================
# IDENTIFY SHUT-IN WELL / DATE PAIRS
# ============================================================

shut_in_dates = (
    production[
        production["Status"]
        .astype(str)
        .str.upper()
        == "SHUT_IN"
    ][
        ["Well_ID_Normalized", "Datetime"]
    ]
    .rename(
        columns={
            "Well_ID_Normalized": "wellId",
            "Datetime": "period"
        }
    )
    .drop_duplicates()
)


# ============================================================
# REMOVE SHUT-IN DAYS FROM PRODUCTION
# ============================================================

production_active = production[
    production["Status"]
    .astype(str)
    .str.upper()
    != "SHUT_IN"
].copy()


# ============================================================
# REMOVE SAME SHUT-IN WELL / DATES FROM FINANCE
# ============================================================

finance_active = finance_clean.merge(
    shut_in_dates.assign(
        SHUT_IN_FLAG=1
    ),
    on=[
        "wellId",
        "period"
    ],
    how="left"
)

finance_active = finance_active[
    finance_active["SHUT_IN_FLAG"].isna()
].drop(
    columns="SHUT_IN_FLAG"
).copy()


# ============================================================
# CLEAN PRODUCTION VOLUMES
# ============================================================

def convert_m3_to_bbl(x):
    x = str(x).lower().strip()

    if "m3" in x:
        return float(
            x.replace("m3", "").strip()
        ) * 6.2898

    return float(x)


def clean_gas_value(x):
    x = str(x).lower().strip()

    if x.endswith("mcf"):
        return float(
            x.replace("mcf", "").strip()
        )

    if x.endswith("mmbtu"):
        return float(
            x.replace("mmbtu", "").strip()
        ) * 0.963

    return float(x)


production_active["Allocation Oil Volume"] = (
    production_active["Allocation Oil Volume"]
    .apply(convert_m3_to_bbl)
)

production_active["Allocation Gas Volume"] = (
    production_active["Allocation Gas Volume"]
    .apply(clean_gas_value)
)


# ============================================================
# CALCULATE DAILY BOE
# ============================================================

production_active["BOE"] = (
    production_active["Allocation Oil Volume"]
    +
    production_active["Allocation Gas Volume"] / 6
)


# ============================================================
# CREATE ONE-ROW-PER-WELL DATAFRAME
# ============================================================

well_df = (
    production_active[
        ["Well_ID_Normalized"]
    ]
    .drop_duplicates()
    .rename(
        columns={
            "Well_ID_Normalized": "Well ID"
        }
    )
    .sort_values("Well ID")
    .reset_index(drop=True)
)


# ============================================================
# ADD AVERAGE OPERATING COST
# ============================================================

avg_cost = (
    finance_active
    .groupby(
        "wellId",
        as_index=False
    )
    .agg(
        Avg_Operating_Cost=(
            "operatingCost",
            "mean"
        )
    )
)

well_df = well_df.merge(
    avg_cost,
    left_on="Well ID",
    right_on="wellId",
    how="left"
)

well_df = well_df.drop(
    columns="wellId"
)


# ============================================================
# REMOVE WELLS WITH ZERO OPERATING COST
# ============================================================

well_df = well_df[
    well_df["Avg_Operating_Cost"] != 0
].reset_index(drop=True)


# ============================================================
# HYPERBOLIC ARPS MODEL
# ============================================================

def hyperbolic_arps(t, qi, Di, b):
    return qi / (
        1 + b * Di * t
    ) ** (1 / b)


# ============================================================
# FIT EACH WELL AND CALCULATE 5-YEAR TOTAL BOE
# ============================================================

forecast_results = []

for wid in well_df["Well ID"]:

    df = production_active[
        production_active[
            "Well_ID_Normalized"
        ] == wid
    ].copy()

    df = df.sort_values(
        "Datetime"
    )

    if len(df) < 20:
        print(
            f"Skipping {wid}: not enough production data"
        )
        continue


    # --------------------------------------------------------
    # SMOOTH DATA ONLY TO LOCATE STABLE PEAK
    # --------------------------------------------------------

    df["BOE_smooth"] = (
        df["BOE"]
        .rolling(
            window=14,
            center=True,
            min_periods=1
        )
        .mean()
    )

    peak_idx = (
        df["BOE_smooth"]
        .idxmax()
    )

    df_fit = (
        df.loc[peak_idx:]
        .copy()
    )

    if len(df_fit) < 20:
        print(
            f"Skipping {wid}: not enough data after peak"
        )
        continue


    # --------------------------------------------------------
    # TIME IN YEARS FROM START OF DECLINE
    # --------------------------------------------------------

    t = (
        (
            df_fit["Datetime"]
            -
            df_fit["Datetime"].iloc[0]
        )
        .dt.days
        .to_numpy(dtype=float)
        / 365.25
    )

    q = (
        df_fit["BOE"]
        .to_numpy(dtype=float)
    )


    try:

        # ----------------------------------------------------
        # FIT HYPERBOLIC MODEL
        # ----------------------------------------------------

        params, _ = curve_fit(
            hyperbolic_arps,
            t,
            q,
            p0=[
                max(q[0], 0.1),
                0.2,
                0.8
            ],
            bounds=(
                [
                    0.1,
                    0.001,
                    0.01
                ],
                [
                    5000,
                    3.0,
                    2.0
                ]
            ),
            maxfev=50000
        )

        qi, Di, b = params


        # ----------------------------------------------------
        # LAST ACTUAL PRODUCTION DATE
        # ----------------------------------------------------

        last_date = (
            df["Datetime"].max()
        )


        # ----------------------------------------------------
        # NEXT 60 MONTHS
        # ----------------------------------------------------

        forecast_months = pd.date_range(
            start=(
                last_date
                +
                pd.offsets.MonthBegin(1)
            ),
            periods=60,
            freq="MS"
        )


        # ----------------------------------------------------
        # FORECAST TIME AS NUMPY ARRAY
        # ----------------------------------------------------

        t_forecast = (
            (
                forecast_months
                -
                df_fit["Datetime"].iloc[0]
            )
            .days
            .to_numpy(dtype=float)
            / 365.25
        )


        # ----------------------------------------------------
        # FORECAST BOE/DAY
        # ----------------------------------------------------

        q_forecast = np.asarray(
            hyperbolic_arps(
                t_forecast,
                qi,
                Di,
                b
            ),
            dtype=float
        )


        # ----------------------------------------------------
        # CONVERT BOE/DAY TO MONTHLY BOE
        # ----------------------------------------------------

        days = (
            forecast_months
            .days_in_month
            .to_numpy(dtype=float)
        )

        monthly_volume = (
            q_forecast
            *
            days
        )


        # ----------------------------------------------------
        # TOTAL BOE OVER NEXT 5 YEARS
        # ----------------------------------------------------

        forecast_5yr_boe = float(
            np.sum(
                monthly_volume
            )
        )


        forecast_results.append(
            {
                "Well ID": wid,
                "Forecast_5yr_BOE": forecast_5yr_boe
            }
        )


        print(
            f"{wid} | "
            f"5-Year BOE = {forecast_5yr_boe:,.2f} | "
            f"qi = {qi:.2f} | "
            f"Di = {Di:.4f} | "
            f"b = {b:.4f}"
        )


    except Exception as e:

        print(
            f"Could not fit {wid}: {e}"
        )


# ============================================================
# ADD FORECASTS TO WELL DATAFRAME
# ============================================================

forecast_df = pd.DataFrame(
    forecast_results
)

if not forecast_df.empty:

    well_df = well_df.merge(
        forecast_df,
        on="Well ID",
        how="left"
    )

else:

    well_df["Forecast_5yr_BOE"] = np.nan


# ============================================================
# FINAL DATAFRAME
# ============================================================

# ------------------------------------------------------------
# NORMALIZED WELL SCORE
# ------------------------------------------------------------

# Higher production = better
well_df["Production_Score"] = (
    well_df["Forecast_5yr_BOE"] - well_df["Forecast_5yr_BOE"].min()
) / (
    well_df["Forecast_5yr_BOE"].max() - well_df["Forecast_5yr_BOE"].min()
)

# Lower operating cost = better
well_df["Cost_Score"] = 1 - (
    (
        well_df["Avg_Operating_Cost"] - well_df["Avg_Operating_Cost"].min()
    ) / (
        well_df["Avg_Operating_Cost"].max() - well_df["Avg_Operating_Cost"].min()
    )
)

# Equal weighting
well_df["Well_Score"] = (
    0.5 * well_df["Production_Score"]
    + 0.5 * well_df["Cost_Score"]
)

# Best and worst 5
best_5 = well_df.nlargest(5, "Well_Score")
worst_5 = well_df.nsmallest(5, "Well_Score")


# ------------------------------------------------------------
# EXPORT JSON FOR <Q4EconomicsChart />
# ------------------------------------------------------------

worst_ids = set(worst_5["Well ID"])
best_ids = set(best_5["Well ID"])


def _reco(wid):
    if wid in worst_ids:
        return "Decommission / sell"
    if wid in best_ids:
        return "Invest / keep"
    return "Keep"


ranked = well_df.sort_values("Well_Score").reset_index(drop=True)

rows_out = []
for _, r in ranked.iterrows():
    rows_out.append({
        "wellId": r["Well ID"],
        "avgOperatingCost": round(float(r["Avg_Operating_Cost"]), 2),
        "forecast5yrBoe": (
            None if pd.isna(r["Forecast_5yr_BOE"]) else round(float(r["Forecast_5yr_BOE"]), 0)
        ),
        "productionScore": (
            None if pd.isna(r["Production_Score"]) else round(float(r["Production_Score"]), 4)
        ),
        "costScore": (
            None if pd.isna(r["Cost_Score"]) else round(float(r["Cost_Score"]), 4)
        ),
        "wellScore": (
            None if pd.isna(r["Well_Score"]) else round(float(r["Well_Score"]), 4)
        ),
        "recommendation": _reco(r["Well ID"]),
    })

payload = {
    "generatedBy": "scripts/finance.py",
    "method": (
        "Per-well 5-year hyperbolic-forecast BOE and mean operating cost, each "
        "min-max normalized (production up = better, cost down = better), combined "
        "50/50 into Well_Score. Bottom 5 flagged for decommission/sale."
    ),
    "wells": rows_out,
    "decommissionOrSell": [w for w in rows_out if w["recommendation"] == "Decommission / sell"],
}
OUT_PATH.write_text(json.dumps(payload, indent=2))
print(f"\nWrote {OUT_PATH}  ({len(rows_out)} wells)")


# ------------------------------------------------------------
# PLOT  (optional — needs matplotlib)
# ------------------------------------------------------------

if not HAVE_PLT:
    raise SystemExit(0)

plt.figure(figsize=(12, 8))

# All wells
plt.scatter(
    well_df["Forecast_5yr_BOE"],
    well_df["Avg_Operating_Cost"],
    s=70,
    color="gray",
    alpha=0.6
)

# Best 5
plt.scatter(
    best_5["Forecast_5yr_BOE"],
    best_5["Avg_Operating_Cost"],
    s=140,
    color="green",
    label="Best 5"
)

# Worst 5
plt.scatter(
    worst_5["Forecast_5yr_BOE"],
    worst_5["Avg_Operating_Cost"],
    s=140,
    color="red",
    label="Worst 5"
)

# Well labels
for _, row in well_df.iterrows():
    plt.annotate(
        row["Well ID"],
        (
            row["Forecast_5yr_BOE"],
            row["Avg_Operating_Cost"]
        ),
        xytext=(5, 5),
        textcoords="offset points",
        fontsize=8
    )

plt.xlabel("5-Year Forecast BOE")
plt.ylabel("Average Operating Cost ($)")
plt.title("5-Year Forecast BOE vs Average Operating Cost")

plt.grid(True)
plt.legend()
plt.tight_layout()
plt.show()