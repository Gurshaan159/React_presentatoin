import pandas as pd
import numpy as np
from scipy.optimize import curve_fit
from pathlib import Path
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


# ============================================================
# LOAD DATA
# ============================================================

DATA_DIR = Path(__file__).resolve().parents[1]
CHART_PATH = DATA_DIR.parent / "assets" / "q4_monte_carlo_paths.png"
RESULTS_PATH = DATA_DIR / "q4_monte_carlo.json"

production = pd.read_csv(
    DATA_DIR / "production.csv"
)

finance = pd.read_json(
    DATA_DIR / "financial_estacado.json"
)


# ============================================================
# FLATTEN FINANCE JSON
# ============================================================

finance_records = pd.json_normalize(
    finance["records"]
)

finance_clean = pd.concat(
    [
        finance.drop(
            columns=["records"]
        ).reset_index(drop=True),

        finance_records.reset_index(
            drop=True
        )
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

    finance_clean[col] = (
        finance_clean[col]
        .astype(str)
        .str.replace(
            "USD",
            "",
            regex=False
        )
        .str.replace(
            "$",
            "",
            regex=False
        )
        .str.replace(
            ",",
            "",
            regex=False
        )
        .str.strip()
    )

    finance_clean[col] = pd.to_numeric(
        finance_clean[col],
        errors="coerce"
    )


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

DATE_MIN = pd.Timestamp("2025-08-27")
DATE_MAX = pd.Timestamp("2026-08-26")


def normalize_finance_date(x):
    x = str(x).strip()

    # First try month/day interpretation.
    date = pd.to_datetime(
        x,
        format="mixed",
        dayfirst=False,
        errors="coerce"
    )

    if (
        pd.notna(date)
        and DATE_MIN <= date <= DATE_MAX
    ):
        return date

    # If that falls outside the valid data window,
    # try day/month interpretation.
    swapped = pd.to_datetime(
        x,
        format="mixed",
        dayfirst=True,
        errors="coerce"
    )

    if (
        pd.notna(swapped)
        and DATE_MIN <= swapped <= DATE_MAX
    ):
        return swapped

    return pd.NaT


finance_clean["period"] = finance_clean["period"].apply(
    normalize_finance_date
)

finance_clean = finance_clean.dropna(
    subset=["period"]
).copy()


# ============================================================
# NORMALIZE FINANCE WELL IDS
# ============================================================

finance_clean["wellId"] = (
    finance_clean["wellId"]
    .astype(str)
    .str.strip()
    .str.extract(
        r"(\d+)",
        expand=False
    )
)

finance_clean = finance_clean.dropna(
    subset=["wellId"]
).copy()

finance_clean["wellId"] = (
    finance_clean["wellId"]
    .astype(int)
    .map(
        lambda x: f"W{x:04d}"
    )
)


# ============================================================
# CLEAN PRODUCTION DATES
# ============================================================

# DATE_MIN and DATE_MAX were defined above and are reused here.


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


    if (
        pd.notna(date)
        and DATE_MIN <= date <= DATE_MAX
    ):
        return date


    try:

        parts = x.split("/")

        if len(parts) >= 3:

            month = parts[0]
            day = parts[1]
            year = parts[2]

            swapped = (
                f"{day}/{month}/{year}"
            )

            swapped_date = pd.to_datetime(
                swapped,
                format="mixed",
                dayfirst=False,
                errors="coerce"
            )

            if (
                pd.notna(swapped_date)
                and DATE_MIN
                <= swapped_date
                <= DATE_MAX
            ):
                return swapped_date

    except Exception:
        pass


    return pd.NaT


production["Datetime"] = (
    production["Datetime"]
    .apply(normalize_datetime)
)

production = production.dropna(
    subset=["Datetime"]
).copy()


# ============================================================
# NORMALIZE PRODUCTION WELL IDS
# ============================================================

production["Well_ID_Normalized"] = (
    production["Well ID"]
    .astype(str)
    .str.strip()
    .str.extract(
        r"(\d+)",
        expand=False
    )
)

production = production.dropna(
    subset=["Well_ID_Normalized"]
).copy()

production["Well_ID_Normalized"] = (
    production["Well_ID_Normalized"]
    .astype(int)
    .map(
        lambda x: f"W{x:04d}"
    )
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
        [
            "Well_ID_Normalized",
            "Datetime"
        ]
    ]
    .rename(
        columns={
            "Well_ID_Normalized":
                "wellId",

            "Datetime":
                "period"
        }
    )
    .drop_duplicates()
)


# ============================================================
# REMOVE SHUT-IN DAYS
# ============================================================

production_active = production[
    production["Status"]
    .astype(str)
    .str.upper()
    != "SHUT_IN"
].copy()


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
    finance_active[
        "SHUT_IN_FLAG"
    ].isna()
].drop(
    columns="SHUT_IN_FLAG"
).copy()


# ============================================================
# CLEAN PRODUCTION VOLUMES
# ============================================================

def convert_m3_to_bbl(x):

    x = str(x).lower().strip()

    if "m3" in x:

        return (
            float(
                x.replace(
                    "m3",
                    ""
                ).strip()
            )
            * 6.2898
        )

    return float(x)


def clean_gas_value(x):

    x = str(x).lower().strip()

    if x.endswith("mcf"):

        return float(
            x.replace(
                "mcf",
                ""
            ).strip()
        )

    if x.endswith("mmbtu"):

        return (
            float(
                x.replace(
                    "mmbtu",
                    ""
                ).strip()
            )
            * 0.963
        )

    return float(x)


production_active[
    "Allocation Oil Volume"
] = (
    production_active[
        "Allocation Oil Volume"
    ]
    .apply(convert_m3_to_bbl)
)

production_active[
    "Allocation Gas Volume"
] = (
    production_active[
        "Allocation Gas Volume"
    ]
    .apply(clean_gas_value)
)


# ============================================================
# CALCULATE DAILY BOE
# ============================================================

production_active["BOE"] = (
    production_active[
        "Allocation Oil Volume"
    ]
    +
    production_active[
        "Allocation Gas Volume"
    ] / 6
)




# ============================================================
# CREATE ONE-ROW-PER-WELL DATAFRAME
# ============================================================

well_df = (
    production_active[["Well_ID_Normalized"]]
    .drop_duplicates()
    .rename(columns={"Well_ID_Normalized": "Well ID"})
    .sort_values("Well ID")
    .reset_index(drop=True)
)


# ============================================================
# ADD AVERAGE DAILY OPERATING COST PER WELL
# ============================================================

avg_cost = (
    finance_active
    .groupby("wellId", as_index=False)
    .agg(
        Avg_Operating_Cost=("operatingCost", "mean")
    )
)

well_df = well_df.merge(
    avg_cost,
    left_on="Well ID",
    right_on="wellId",
    how="left"
)

well_df = well_df.drop(columns="wellId")

well_df = well_df[
    well_df["Avg_Operating_Cost"].notna()
    & (well_df["Avg_Operating_Cost"] > 0)
].reset_index(drop=True)


# ============================================================
# HYPERBOLIC ARPS MODEL
# ============================================================

def hyperbolic_arps(t, qi, Di, b):
    return qi / (1 + b * Di * t) ** (1 / b)


# ============================================================
# MERGE FINANCE + PRODUCTION
# ============================================================

price_df = finance_active.merge(
    production_active[
        [
            "Well_ID_Normalized",
            "Datetime",
            "BOE"
        ]
    ],
    left_on=[
        "wellId",
        "period"
    ],
    right_on=[
        "Well_ID_Normalized",
        "Datetime"
    ],
    how="inner"
)


# ============================================================
# BUILD ONE REALIZED REVENUE-PER-BOE SERIES PER DAY
# ============================================================

# IMPORTANT:
# The original file used finance["costPerBarrel"] as if it were
# the commodity selling price. It is not. Instead, derive a
# realized revenue-per-BOE directly from actual daily revenue
# and actual daily BOE.

daily_price = (
    price_df
    .groupby(
        "period",
        as_index=False
    )
    .agg(
        total_revenue=("revenue", "sum"),
        total_boe=("BOE", "sum")
    )
    .sort_values("period")
    .reset_index(drop=True)
)

daily_price = daily_price[
    daily_price["total_boe"] > 0
].copy()

daily_price["price_per_barrel"] = (
    daily_price["total_revenue"]
    / daily_price["total_boe"]
)

# Remove non-finite or non-positive values before log returns.
daily_price = daily_price[
    np.isfinite(daily_price["price_per_barrel"])
    & (daily_price["price_per_barrel"] > 0)
].copy()


# ============================================================
# CALCULATE DAILY PRICE CHANGES
# ============================================================

daily_price["price_change"] = (
    daily_price["price_per_barrel"]
    - daily_price["price_per_barrel"].shift(1)
)

daily_price = daily_price.dropna(
    subset=["price_change"]
).copy()


# ============================================================
# BASIC PRICE STATISTICS FOR MONTE CARLO
# ============================================================

starting_price = (
    daily_price["price_per_barrel"].iloc[-1]
)

# Keep zero drift
mean_daily_change = 0.0

daily_change_volatility = (
    daily_price["price_change"].std()
)

print(
    "\nStarting realized revenue per BOE:",
    starting_price
)

print(
    "Mean daily price change:",
    mean_daily_change
)

print(
    "Daily price-change volatility:",
    daily_change_volatility
)

print(
    "\nHistorical realized revenue-per-BOE summary:"
)

print(
    daily_price["price_per_barrel"].describe()
)

print(
    "\nPrepared daily realized revenue-per-BOE data:"
)

print(
    daily_price.tail(10)
)


# ============================================================
# DAILY MONTE CARLO REALIZED REVENUE-PER-BOE SIMULATION
# ============================================================

NUM_SIMULATIONS = 10000
FORECAST_YEARS = 5
TRADING_DAYS_PER_YEAR = 365

NUM_DAYS = (
    FORECAST_YEARS
    * TRADING_DAYS_PER_YEAR
)

rng = np.random.default_rng(
    seed=42
)


# ------------------------------------------------------------
# GENERATE RANDOM DAILY PRICE CHANGES
# ------------------------------------------------------------

simulated_changes = rng.normal(
    loc=mean_daily_change,
    scale=daily_change_volatility,
    size=(
        NUM_DAYS,
        NUM_SIMULATIONS
    )
)


# ------------------------------------------------------------
# GENERATE DAILY PRICE PATHS
# ------------------------------------------------------------

cumulative_changes = np.cumsum(
    simulated_changes,
    axis=0
)

simulated_prices = (
    starting_price
    + cumulative_changes
)


# ------------------------------------------------------------
# ADD STARTING PRICE AS DAY 0
# ------------------------------------------------------------

simulated_prices = np.vstack(
    [
        np.full(
            NUM_SIMULATIONS,
            starting_price
        ),
        simulated_prices
    ]
)


# ============================================================
# CREATE FORECAST DATE INDEX
# ============================================================

forecast_dates = pd.date_range(
    start=(
        daily_price["period"].max()
        + pd.Timedelta(days=1)
    ),
    periods=NUM_DAYS,
    freq="D"
)


# ============================================================
# QUICK VALIDATION
# ============================================================

print("\nMonte Carlo simulation complete")

print(
    "Number of simulations:",
    NUM_SIMULATIONS
)

print(
    "Forecast days:",
    NUM_DAYS
)

print(
    "Starting realized revenue per BOE:",
    starting_price
)

print(
    "\nSimulated price array shape:"
)

print(
    simulated_prices.shape
)


# ============================================================
# FINAL PRICE DISTRIBUTION
# ============================================================

final_prices = (
    simulated_prices[-1]
)

print(
    "\n5-year final price distribution:"
)

print(
    "Mean:",
    np.mean(final_prices)
)

print(
    "Median:",
    np.median(final_prices)
)

print(
    "5th percentile:",
    np.percentile(
        final_prices,
        5
    )
)

print(
    "95th percentile:",
    np.percentile(
        final_prices,
        95
    )
)

print(
    "Minimum:",
    np.min(final_prices)
)

print(
    "Maximum:",
    np.max(final_prices)
)

# ============================================================
# PLOT MONTE CARLO PRICE SIMULATIONS
# ============================================================
# ============================================================
# PLOT 1000 RANDOM MONTE CARLO PATHS
# ============================================================

plot_prices = simulated_prices[1:, :]

# Pick 1000 random simulation columns
num_to_plot = min(1000, plot_prices.shape[1])

random_indices = rng.choice(
    plot_prices.shape[1],
    size=num_to_plot,
    replace=False
)

plt.figure(figsize=(14, 8))

for i in random_indices:
    plt.plot(
        forecast_dates,
        plot_prices[:, i],
        alpha=0.08,
        linewidth=0.5
    )

plt.xlabel("Forecast date")
plt.ylabel("Simulated realized revenue per BOE ($/BOE)")
plt.tight_layout()
plt.savefig(
    CHART_PATH,
    dpi=160,
    bbox_inches="tight",
    facecolor="white"
)
plt.close()
print(f"Saved Monte Carlo chart to {CHART_PATH}")
# ============================================================
# PROBABILITY OF PROFIT FOR EACH WELL
# ============================================================

profit_results = []

# Price paths corresponding to the 1,825 forecast days
future_prices = simulated_prices[1:, :]

for _, well_row in well_df.iterrows():

    wid = well_row["Well ID"]

    avg_daily_operating_cost = (
        well_row["Avg_Operating_Cost"]
    )

    # --------------------------------------------------------
    # GET HISTORICAL PRODUCTION FOR WELL
    # --------------------------------------------------------

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
    # FIND STABLE PRODUCTION PEAK
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
            f"Skipping {wid}: not enough post-peak data"
        )
        continue


    # --------------------------------------------------------
    # HISTORICAL TIME AXIS
    # --------------------------------------------------------

    t = (
        (
            df_fit["Datetime"]
            - df_fit["Datetime"].iloc[0]
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
        # FIT ARPS DECLINE CURVE
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
        # DAILY 5-YEAR BOE FORECAST
        # ----------------------------------------------------

        t_forecast = (
            (
                forecast_dates
                - df_fit["Datetime"].iloc[0]
            )
            .days
            .to_numpy(dtype=float)
            / 365.25
        )

        daily_boe = np.asarray(
            hyperbolic_arps(
                t_forecast,
                qi,
                Di,
                b
            ),
            dtype=float
        )


        # ----------------------------------------------------
        # REVENUE FOR ALL 10,000 SIMULATIONS
        #
        # daily_boe:
        #   (1825,)
        #
        # future_prices:
        #   (1825, 10000)
        #
        # Result:
        #   one 5-year revenue number per simulation
        # ----------------------------------------------------

        simulated_revenue = (
            daily_boe
            @ future_prices
        )


        # ----------------------------------------------------
        # 5-YEAR OPERATING COST
        #
        # Assumes Avg_Operating_Cost is an average DAILY cost.
        # ----------------------------------------------------

        total_operating_cost = (
            avg_daily_operating_cost
            * NUM_DAYS
        )


        # ----------------------------------------------------
        # PROFIT FOR EACH SIMULATION
        # ----------------------------------------------------

        simulated_profit = (
            simulated_revenue
            - total_operating_cost
        )


        # ----------------------------------------------------
        # PROFITABILITY STATISTICS
        # ----------------------------------------------------

        profitable_count = np.sum(
            simulated_profit > 0
        )

        probability_profit = (
            profitable_count
            / NUM_SIMULATIONS
        )

        probability_loss = (
            1
            - probability_profit
        )


        profit_results.append(
            {
                "Well ID": wid,

                "Probability_Profit": (
                    probability_profit
                ),

                "Probability_Profit_Pct": (
                    probability_profit * 100
                ),

                "Probability_Loss_Pct": (
                    probability_loss * 100
                ),

                "Mean_5yr_Profit": (
                    np.mean(
                        simulated_profit
                    )
                ),

                "Median_5yr_Profit": (
                    np.median(
                        simulated_profit
                    )
                ),

                "P5_5yr_Profit": (
                    np.percentile(
                        simulated_profit,
                        5
                    )
                ),

                "P95_5yr_Profit": (
                    np.percentile(
                        simulated_profit,
                        95
                    )
                )
            }
        )


    except Exception as e:

        print(
            f"Could not simulate {wid}: {e}"
        )


# ============================================================
# CREATE RANKED DATAFRAME
# ============================================================

profitability_df = pd.DataFrame(
    profit_results
)

profitability_df = (
    profitability_df
    .sort_values(
        "Probability_Profit",
        ascending=False
    )
    .reset_index(drop=True)
)

profitability_df.insert(
    0,
    "Rank",
    np.arange(
        1,
        len(profitability_df) + 1
    )
)


# ============================================================
# ROUND DISPLAY VALUES
# ============================================================

profitability_df[
    "Probability_Profit_Pct"
] = profitability_df[
    "Probability_Profit_Pct"
].round(2)

profitability_df[
    "Probability_Loss_Pct"
] = profitability_df[
    "Probability_Loss_Pct"
].round(2)

profitability_df[
    "Mean_5yr_Profit"
] = profitability_df[
    "Mean_5yr_Profit"
].round(2)

profitability_df[
    "Median_5yr_Profit"
] = profitability_df[
    "Median_5yr_Profit"
].round(2)

profitability_df[
    "P5_5yr_Profit"
] = profitability_df[
    "P5_5yr_Profit"
].round(2)

profitability_df[
    "P95_5yr_Profit"
] = profitability_df[
    "P95_5yr_Profit"
].round(2)


# ============================================================
# PRINT RANKINGS
# ============================================================

print(
    "\nWELL PROFITABILITY RANKINGS"
)

print(
    profitability_df.to_string(
        index=False
    )
)


# ============================================================
# EXPORT RANKINGS FOR THE REACT Q4 SECTION
# ============================================================

rank_rows = []
for _, row in profitability_df.iterrows():
    rank_rows.append(
        {
            "rank": int(row["Rank"]),
            "wellId": row["Well ID"],
            "probabilityProfit": round(float(row["Probability_Profit"]), 4),
            "probabilityProfitPct": float(row["Probability_Profit_Pct"]),
            "probabilityLossPct": float(row["Probability_Loss_Pct"]),
            "mean5yrProfit": float(row["Mean_5yr_Profit"]),
            "median5yrProfit": float(row["Median_5yr_Profit"]),
            "p5_5yrProfit": float(row["P5_5yr_Profit"]),
            "p95_5yrProfit": float(row["P95_5yr_Profit"]),
        }
    )

payload = {
    "generatedBy": "scripts/carlos_daily_fixed.py",
    "method": (
        "10,000 seeded daily Monte Carlo realized-revenue-per-BOE paths over "
        "five years, combined with each well's Arps production decline and "
        "operating cost. Wells are ranked by probability of positive profit."
    ),
    "simulationCount": NUM_SIMULATIONS,
    "forecastYears": FORECAST_YEARS,
    "startingRevenuePerBoe": round(float(starting_price), 2),
    "wells": rank_rows,
    "highest5": rank_rows[:5],
    "lowest5": rank_rows[-5:][::-1],
    "decommissionWellIds": [row["wellId"] for row in rank_rows[-5:]],
}

RESULTS_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(f"Saved Monte Carlo rankings to {RESULTS_PATH}")
