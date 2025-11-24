from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
import json
import hashlib

def generate_filtered_cache_key(state_id: int, min_age: int = None, max_age: int = None, sex: int = None) -> str:
    # Normaliziraj vrijednosti (npr. pretvori None u "null")
    parts = [
        str(state_id),
        str(min_age) if min_age is not None else "null",
        str(max_age) if max_age is not None else "null",
        str(sex) if sex is not None else "null"
    ]
    key_str = "_".join(parts)
    # Opcionalno: hash za kraći/čišći naziv
    # return hashlib.md5(key_str.encode()).hexdigest()
    return key_str  # jednostavnije za debug

app = FastAPI()

# makes backend API accessible from your frontend app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Any origin can access the API
    allow_credentials=True, # Allows sending cookies, authorization headers ...
    allow_methods=["*"], # Allows all HTTP methods
    allow_headers=["*"],
)

# points to the data folder inside the backend directory
BASE_FOLDER = os.path.join(os.path.dirname(__file__), "data")
NATIONAL_TREND_CACHE_PATH = os.path.join(BASE_FOLDER, "national_trend.json")
STATE_TREND_CACHE_FOLDER = os.path.join(BASE_FOLDER, "state_trend_cache")
os.makedirs(STATE_TREND_CACHE_FOLDER, exist_ok=True)

state_name_map = {
        1: "Alabama", 2: "Alaska", 4: "Arizona", 5: "Arkansas", 6: "California",
        8: "Colorado", 9: "Connecticut", 10: "Delaware", 11: "District of Columbia",
        12: "Florida", 13: "Georgia", 15: "Hawaii", 16: "Idaho", 17: "Illinois",
        18: "Indiana", 19: "Iowa", 20: "Kansas", 21: "Kentucky", 22: "Louisiana",
        23: "Maine", 24: "Maryland", 25: "Massachusetts", 26: "Michigan",
        27: "Minnesota", 28: "Mississippi", 29: "Missouri", 30: "Montana",
        31: "Nebraska", 32: "Nevada", 33: "New Hampshire", 34: "New Jersey",
        35: "New Mexico", 36: "New York", 37: "North Carolina", 38: "North Dakota",
        39: "Ohio", 40: "Oklahoma", 41: "Oregon", 42: "Pennsylvania",
        44: "Rhode Island", 45: "South Carolina", 46: "South Dakota", 47: "Tennessee",
        48: "Texas", 49: "Utah", 50: "Vermont", 51: "Virginia", 53: "Washington",
        54: "West Virginia", 55: "Wisconsin", 56: "Wyoming"
    }

def save_trend_cache(data):
    with open(NATIONAL_TREND_CACHE_PATH, "w") as f:
        json.dump(data, f)

def load_trend_cache():
    if os.path.exists(NATIONAL_TREND_CACHE_PATH):
        with open(NATIONAL_TREND_CACHE_PATH, "r") as f:
            return json.load(f)
    return None

def save_state_trend_cache(state_id, data):
    path = os.path.join(STATE_TREND_CACHE_FOLDER, f"{state_id}.json")
    with open(path, "w") as f:
        json.dump(data, f)

def load_state_trend_cache(state_id):
    path = os.path.join(STATE_TREND_CACHE_FOLDER, f"{state_id}.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return None

FILTERED_TREND_CACHE_FOLDER = os.path.join(BASE_FOLDER, "state_trend_filtered_cache")
os.makedirs(FILTERED_TREND_CACHE_FOLDER, exist_ok=True)

def save_filtered_trend_cache(state_id: int, min_age, max_age, sex, data):
    key = generate_filtered_cache_key(state_id, min_age, max_age, sex)
    path = os.path.join(FILTERED_TREND_CACHE_FOLDER, f"{key}.json")
    with open(path, "w") as f:
        json.dump(data, f)

def load_filtered_trend_cache(state_id: int, min_age, max_age, sex):
    key = generate_filtered_cache_key(state_id, min_age, max_age, sex)
    path = os.path.join(FILTERED_TREND_CACHE_FOLDER, f"{key}.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return None

RISK_PROFILE_CACHE_FOLDER = os.path.join(BASE_FOLDER, "risk_profile_cache")
os.makedirs(RISK_PROFILE_CACHE_FOLDER, exist_ok=True)

def generate_risk_cache_key(state_id: int, year: int, min_age=None, max_age=None, sex=None) -> str:
    parts = [
        str(state_id),
        str(year),
        str(min_age) if min_age is not None else "null",
        str(max_age) if max_age is not None else "null",
        str(sex) if sex is not None else "null"
    ]
    return "_".join(parts)

def save_risk_profile_cache(state_id, year, min_age, max_age, sex, data):
    key = generate_risk_cache_key(state_id, year, min_age, max_age, sex)
    path = os.path.join(RISK_PROFILE_CACHE_FOLDER, f"{key}.json")
    with open(path, "w") as f:
        json.dump(data, f)

def load_risk_profile_cache(state_id, year, min_age, max_age, sex):
    key = generate_risk_cache_key(state_id, year, min_age, max_age, sex)
    path = os.path.join(RISK_PROFILE_CACHE_FOLDER, f"{key}.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return None

@app.get("/api/check_required_columns")
def check_required_columns():
    required_columns = {
        "ACCIDENT": ["ST_CASE", "YEAR", "STATE", "MONTH", "DAY", "HOUR"],
        "PERSON": ["ST_CASE", "DRINKING", "ALC_RES", "AGE", "SEX"]
    }
    results = {}

    for year_folder in os.listdir(BASE_FOLDER):
        try:
            year = int(year_folder)
            year_path = os.path.join(BASE_FOLDER, str(year))

            if os.path.isdir(year_path):
                results[year] = {}

                for csv_type, expected_cols in required_columns.items():
                    csv_filename = f"{csv_type}.csv"
                    file_path = os.path.join(year_path, csv_filename)

                    if os.path.exists(file_path):
                        try:
                            df = pd.read_csv(file_path, nrows=0, encoding="utf-8-sig")
                            available_cols = [col.replace('\ufeff', '') for col in df.columns.tolist()]

                            found_cols = []
                            missing_cols = []

                            for col in expected_cols:
                                if col in available_cols:
                                    found_cols.append(col)
                                else:
                                    missing_cols.append(col)
                            print(f"Missing columns for {year}: {missing_cols}")
                            results[year][csv_type] = {
                                "found": found_cols,
                                "missing": missing_cols,
                                "available_total": len(available_cols)
                            }
                        except Exception as e:
                            results[year][csv_type] = {"error": str(e)}
                    else:
                        results[year][csv_type] = {"error": "File not found"}

        except ValueError:
            continue

    return results


def load_accident_and_person_data(year):

    accident_path = os.path.join(BASE_FOLDER, str(year), "ACCIDENT.csv")
    person_path = os.path.join(BASE_FOLDER, str(year), "PERSON.csv")

    accident_df = None
    person_df = None

    def load_csv_with_fallback(path):
        if not os.path.exists(path):
            return None

        try:
            return pd.read_csv(path, encoding="utf-8-sig",  low_memory=False)
        except UnicodeDecodeError:
            try:
                # Fallback na cp1252 (za starije godine)
                return pd.read_csv(path, encoding="cp1252",  low_memory=False)
            except Exception as e2:
                print(f"Error loading {path} with both encodings: {e2}")
                return None
        except Exception as e:
            print(f"Error loading {path}: {e}")
            return None

    # Učitaj ACCIDENT
    accident_df = load_csv_with_fallback(accident_path)
    if accident_df is not None:
        print(f"Loaded ACCIDENT for {year}, shape: {accident_df.shape}")

    # Učitaj PERSON
    person_df = load_csv_with_fallback(person_path)
    if person_df is not None:
        print(f"Loaded PERSON for {year}, shape: {person_df.shape}")

    return accident_df, person_df

@app.get("/api/national_trend")
def national_trend():
    # prvo probaj učitati cache
    cached = load_trend_cache()
    if cached is not None:
        print("Returning cached national trend")
        return {"data": cached}

    print("Cache not found, computing national trend...")
    trend_data = []

    for year_folder in os.listdir(BASE_FOLDER):
        try:
            year = int(year_folder)
        except ValueError:
            continue

        accident_df, person_df = load_accident_and_person_data(year)
        if accident_df is None or person_df is None:
            continue

        if 'ST_CASE' not in accident_df.columns or 'ST_CASE' not in person_df.columns:
            continue

        if 'DRINKING' not in person_df.columns:
            continue

        merged_df = pd.merge(accident_df, person_df, on='ST_CASE', how='inner')

        total_records = len(merged_df)
        alcohol_records = len(merged_df[merged_df["DRINKING"] == 1])

        percentage = round((alcohol_records / total_records) * 100, 2) if total_records > 0 else 0

        trend_data.append({
            "YEAR": year,
            "total_accidents": total_records,
            "alcohol_accidents": alcohol_records,
            "percentage": percentage
        })

    trend_data.sort(key=lambda x: x["YEAR"])

    # save cache
    save_trend_cache(trend_data)

    return {"data": trend_data}

@app.get("/api/state_heatmap/{year}")
def state_heatmap(year: int):
    accident_df, person_df = load_accident_and_person_data(year)
    person_df = person_df.drop(columns=["STATE"], errors="ignore")

    if accident_df is None or person_df is None:
        return {"error": f"Data for year {year} not found."}

    # Provjerimo postojeće kolone za državu
    state_col = None
    if "STATE" in accident_df.columns:
        state_col = "STATE"
    elif "STATE_x" in accident_df.columns:
        state_col = "STATE_x"
    else:
        return {"error": "No STATE column found in ACCIDENT data."}

    if "ST_CASE" not in accident_df.columns or "ST_CASE" not in person_df.columns:
        return {"error": f"ST_CASE column missing for year {year}."}

    if "DRINKING" not in person_df.columns:
        return {"error": f"DRINKING column missing for year {year}."}

    merged_df = pd.merge(accident_df, person_df, on="ST_CASE", how="inner")

    # grupiraj po državi
    state_group = merged_df.groupby(state_col).agg(
        total_accidents=pd.NamedAgg(column="ST_CASE", aggfunc="count"),
        alcohol_accidents=pd.NamedAgg(column="DRINKING", aggfunc=lambda x: (x == 1).sum())
    ).reset_index()

    # izračun postotka
    state_group['percentage'] = round((state_group['alcohol_accidents'] / state_group['total_accidents']) * 100, 2)

    total_accidents = state_group['total_accidents'].sum()
    total_alcohol = state_group['alcohol_accidents'].sum()
    national_avg = round((total_alcohol / total_accidents) * 100, 2)

    state_group['difference'] = round(state_group['percentage'] - national_avg, 2)
    state_group['national_avg'] = national_avg
    state_group['state_name'] = state_group[state_col].map(state_name_map)


    # mapiraj u listu dictova za JSON
    result = state_group.rename(columns={state_col: "state"}).to_dict(orient="records")

    return result


@app.get("/api/state_trend/{state_id}")
def state_trend(state_id: str):
    # prvo probaj učitati cache
    cached = load_state_trend_cache(state_id)
    if cached is not None:
        return cached

    results = []

    for year_folder in os.listdir(BASE_FOLDER):
        try:
            year = int(year_folder)
        except ValueError:
            continue

        accident_df, person_df = load_accident_and_person_data(year)
        if accident_df is None or person_df is None:
            continue

        person_df = person_df.drop(columns=["STATE"], errors="ignore")
        merged_df = pd.merge(accident_df, person_df, on="ST_CASE", how="inner")

        state_df = merged_df[merged_df["STATE"] == int(state_id)]
        total_records = len(state_df)
        alcohol_records = len(state_df[state_df["DRINKING"] == 1])
        percentage = round((alcohol_records / total_records) * 100, 2) if total_records > 0 else 0

        results.append({
            "YEAR": year,
            "total_accidents": total_records,
            "alcohol_accidents": alcohol_records,
            "percentage": percentage
        })

    results.sort(key=lambda x: x["YEAR"])
    response = {"state": state_id, "state_name": state_name_map[int(state_id)], "data": results}

    # spremi cache
    save_state_trend_cache(state_id, response)

    return response

@app.get("/api/national_risk_profile/{year}")
def national_risk_profile(year: int):
    accident_df, person_df = load_accident_and_person_data(year)
    if accident_df is None or person_df is None:
        return {"error": f"Data for year {year} not found."}

    conflicting_cols = ["MONTH", "HOUR", "STATE", "YEAR", "DAY"]
    for col in conflicting_cols:
        if col in person_df.columns:
            person_df = person_df.drop(columns=[col])

    # Spoji podatke
    merged_df = pd.merge(accident_df, person_df, on="ST_CASE", how="inner")
    alcohol_df = merged_df[merged_df["DRINKING"] == 1]

    if len(alcohol_df) == 0:
        return {"error": f"No alcohol-related fatalities found for {year}."}

    total = len(alcohol_df)

    # 1. Spol (SEX: 1 = Male, 2 = Female)
    sex_counts = alcohol_df["SEX"].value_counts().to_dict()
    sex_distribution = {
        "male": sex_counts.get(1, 0),
        "female": sex_counts.get(2, 0)
    }

    # 2. Dobne skupine
    def get_age_group(age):
        if pd.isna(age) or age < 0:
            return "unknown"
        if 16 <= age <= 20:
            return "16-20"
        elif 21 <= age <= 24:
            return "21-24"
        elif 25 <= age <= 34:
            return "25-34"
        elif 35 <= age <= 44:
            return "35-44"
        elif 45 <= age <= 54:
            return "45-54"
        elif age >= 55:
            return "55+"
        return "unknown"

    alcohol_df = alcohol_df.copy()
    alcohol_df["age_group"] = alcohol_df["AGE"].apply(get_age_group)
    alcohol_df = alcohol_df[alcohol_df["age_group"] != "unknown"]
    age_counts = alcohol_df["age_group"].value_counts().to_dict()

    # 3. Mjeseci (koristi "MONTH" iz ACCIDENT, sada dostupan bez sufiksa)
    alcohol_df = alcohol_df[pd.to_numeric(alcohol_df["MONTH"], errors="coerce").notnull()]
    alcohol_df["MONTH"] = alcohol_df["MONTH"].astype(int)
    month_valid = alcohol_df[(alcohol_df["MONTH"] >= 1) & (alcohol_df["MONTH"] <= 12)]
    month_counts = month_valid["MONTH"].value_counts().to_dict()
    import calendar
    month_names = {calendar.month_name[m]: int(c) for m, c in month_counts.items()}

    # 4. Vrijeme dana (HOUR: 22–23, 0–5 = noć)
    def is_night(hour):
        if pd.isna(hour):
            return "unknown"
        try:
            h = int(hour)
            return "night" if (h >= 22 or h <= 5) else "day"
        except (ValueError, TypeError):
            return "unknown"

    alcohol_df["time_of_day"] = alcohol_df["HOUR"].apply(is_night)
    alcohol_df = alcohol_df[alcohol_df["time_of_day"] != "unknown"]
    time_counts = alcohol_df["time_of_day"].value_counts().to_dict()

    return {
        "year": year,
        "total_alcohol_fatalities": int(total),
        "by_sex": sex_distribution,
        "by_age_group": age_counts,
        "by_month": month_names,
        "by_time_of_day": time_counts
    }

@app.get("/api/state_risk_profile/{state_id}/{year}")
def state_risk_profile(
    state_id: int,
    year: int,
    min_age: int = None,
    max_age: int = None,
    sex: int = None
):

    cached = load_risk_profile_cache(state_id, year, min_age, max_age, sex)
    if cached is not None:
        print(f"Returning cached risk profile for state {state_id}, year {year}, filters: age=[{min_age}, {max_age}], sex={sex}")
        return cached

    print(f"Computing risk profile for state {state_id}, year {year}, filters: age=[{min_age}, {max_age}], sex={sex}")

    accident_df, person_df = load_accident_and_person_data(year)
    if accident_df is None or person_df is None:
        return {"error": f"Data for year {year} not found."}

    if "STATE" not in accident_df.columns:
        return {"error": f"STATE column missing in ACCIDENT data for {year}."}

    conflicting_cols = ["MONTH", "HOUR", "STATE", "YEAR", "DAY"]
    for col in conflicting_cols:
        if col in person_df.columns:
            person_df = person_df.drop(columns=[col])

    merged_df = pd.merge(accident_df, person_df, on="ST_CASE", how="inner")
    state_filtered = merged_df[merged_df["STATE"] == state_id]

    if len(state_filtered) == 0:
        result = {
            "year": year,
            "state_id": state_id,
            "state_name": state_name_map.get(state_id, f"State {state_id}"),
            "total_alcohol_fatalities": 0,
            "by_sex": {"male": 0, "female": 0},
            "by_age_group": {},
            "by_month": {},
            "by_time_of_day": {},
            "applied_filters": {"min_age": min_age, "max_age": max_age, "sex": sex}
        }
        save_risk_profile_cache(state_id, year, min_age, max_age, sex, result)
        return result

    filtered_df = state_filtered.copy()
    if min_age is not None:
        filtered_df = filtered_df[filtered_df["AGE"] >= min_age]
    if max_age is not None:
        filtered_df = filtered_df[filtered_df["AGE"] <= max_age]
    if sex is not None:
        filtered_df = filtered_df[filtered_df["SEX"] == sex]

    alcohol_df = filtered_df[filtered_df["DRINKING"] == 1]

    if len(alcohol_df) == 0:
        result = {
            "year": year,
            "state_id": state_id,
            "state_name": state_name_map.get(state_id, f"State {state_id}"),
            "total_alcohol_fatalities": 0,
            "by_sex": {"male": 0, "female": 0},
            "by_age_group": {},
            "by_month": {},
            "by_time_of_day": {},
            "applied_filters": {"min_age": min_age, "max_age": max_age, "sex": sex}
        }
        save_risk_profile_cache(state_id, year, min_age, max_age, sex, result)
        return result

    total = len(alcohol_df)

    sex_counts = alcohol_df["SEX"].value_counts().to_dict()
    sex_distribution = {"male": sex_counts.get(1, 0), "female": sex_counts.get(2, 0)}

    def get_age_group(age):
        if pd.isna(age) or age < 0 or age > 120:
            return "unknown"
        if 16 <= age <= 20:
            return "16-20"
        elif 21 <= age <= 24:
            return "21-24"
        elif 25 <= age <= 34:
            return "25-34"
        elif 35 <= age <= 44:
            return "35-44"
        elif 45 <= age <= 54:
            return "45-54"
        elif age >= 55:
            return "55+"
        return "unknown"

    alcohol_df = alcohol_df.copy()
    alcohol_df["age_group"] = alcohol_df["AGE"].apply(get_age_group)
    alcohol_df = alcohol_df[alcohol_df["age_group"] != "unknown"]
    age_counts = alcohol_df["age_group"].value_counts().to_dict()

    alcohol_df = alcohol_df[pd.to_numeric(alcohol_df["MONTH"], errors="coerce").notnull()]
    alcohol_df["MONTH"] = alcohol_df["MONTH"].astype(int)
    month_valid = alcohol_df[(alcohol_df["MONTH"] >= 1) & (alcohol_df["MONTH"] <= 12)]
    month_counts = month_valid["MONTH"].value_counts().to_dict()
    import calendar
    month_names = {calendar.month_name[m]: int(c) for m, c in month_counts.items()}

    def is_night(hour):
        if pd.isna(hour):
            return "unknown"
        try:
            h = int(hour)
            return "night" if (h >= 22 or h <= 5) else "day"
        except:
            return "unknown"

    alcohol_df["time_of_day"] = alcohol_df["HOUR"].apply(is_night)
    alcohol_df = alcohol_df[alcohol_df["time_of_day"] != "unknown"]
    time_counts = alcohol_df["time_of_day"].value_counts().to_dict()

    result = {
        "year": year,
        "state_id": state_id,
        "state_name": state_name_map.get(state_id, f"State {state_id}"),
        "total_alcohol_fatalities": int(total),
        "by_sex": sex_distribution,
        "by_age_group": age_counts,
        "by_month": month_names,
        "by_time_of_day": time_counts,
        "applied_filters": {"min_age": min_age, "max_age": max_age, "sex": sex}
    }

    save_risk_profile_cache(state_id, year, min_age, max_age, sex, result)
    return result


@app.get("/api/state_trend_filtered/{state_id}")
def state_trend_filtered(
    state_id: int,
    min_age: int = None,
    max_age: int = None,
    sex: int = None
):
    cached = load_filtered_trend_cache(state_id, min_age, max_age, sex)
    if cached is not None:
        print(f"Returning cached filtered trend for state {state_id} with filters: age=[{min_age}, {max_age}], sex={sex}")
        return cached

    print(f"Computing filtered trend for state {state_id} with filters: age=[{min_age}, {max_age}], sex={sex}")
    trend_data = []

    for year_folder in os.listdir(BASE_FOLDER):
        try:
            year = int(year_folder)
        except ValueError:
            continue

        accident_df, person_df = load_accident_and_person_data(year)
        if accident_df is None or person_df is None:
            continue

        # Ukloni sukobljene kolone
        conflicting_cols = ["MONTH", "HOUR", "STATE", "YEAR", "DAY"]
        for col in conflicting_cols:
            if col in person_df.columns:
                person_df = person_df.drop(columns=[col])

        merged_df = pd.merge(accident_df, person_df, on="ST_CASE", how="inner")
        state_df = merged_df[merged_df["STATE"] == state_id]

        if len(state_df) == 0:
            continue

        filtered_df = state_df.copy()
        if min_age is not None:
            filtered_df = filtered_df[filtered_df["AGE"] >= min_age]
        if max_age is not None:
            filtered_df = filtered_df[filtered_df["AGE"] <= max_age]
        if sex is not None:
            filtered_df = filtered_df[filtered_df["SEX"] == sex]

        alcohol_df = filtered_df[filtered_df["DRINKING"] == 1]
        alcohol_records = len(alcohol_df)
        total_records = len(filtered_df)
        percentage = round((alcohol_records / total_records) * 100, 2) if total_records > 0 else 0

        trend_data.append({
            "YEAR": year,
            "total_accidents": total_records,
            "alcohol_accidents": alcohol_records,
            "percentage": percentage
        })

    trend_data.sort(key=lambda x: x["YEAR"])
    state_name = state_name_map.get(state_id, f"State {state_id}")
    response = {
        "state": state_id,
        "state_name": state_name,
        "data": trend_data,
        "applied_filters": {
            "min_age": min_age,
            "max_age": max_age,
            "sex": sex
        }
    }

    save_filtered_trend_cache(state_id, min_age, max_age, sex, response)

    return response
