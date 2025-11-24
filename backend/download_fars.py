import os
import requests
import zipfile
import io
import pandas as pd

# --- KONFIGURACIJA ---
START_YEAR = 2010
END_YEAR = 2023

# Folder gdje će se spremiti podaci
script_dir = os.path.dirname(os.path.abspath(__file__))  # backend folder
base_folder = os.path.join(script_dir, "data")           # backend/data
os.makedirs(base_folder, exist_ok=True)

# --- FUNKCIJE ---

def download_fars_year(year):
    """Download ACCIDENT.csv i PERSON.csv za zadanu godinu i spremi u backend/data/<year>/"""
    print(f"\n=== YEAR {year} ===")
    zip_url = f"https://static.nhtsa.gov/nhtsa/downloads/FARS/{year}/National/FARS{year}NationalCSV.zip"
    print(f"Downloading: {zip_url}")

    response = requests.get(zip_url)
    if response.status_code != 200:
        print(f"ZIP not found for {year}. Skipping.")
        return False

    zip_bytes = io.BytesIO(response.content)
    year_folder = os.path.join(base_folder, str(year))
    os.makedirs(year_folder, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_bytes) as z:
            files = z.namelist()
            desired_files = [f for f in files if f.lower().endswith("accident.csv") or f.lower().endswith("person.csv")]

            if not desired_files:
                print(f"No ACCIDENT or PERSON CSV found in {year} ZIP.")
                return False

            for fname in desired_files:
                extract_path = os.path.join(year_folder, os.path.basename(fname))
                with z.open(fname) as src, open(extract_path, "wb") as dst:
                    dst.write(src.read())
                print(f"Saved: {extract_path}")

        return True

    except Exception as e:
        print(f"Error extracting {year}: {e}")
        return False

# --- GLAVNI PROGRAM ---
if __name__ == "__main__":
    print("Starting FARS download & filter (2010-2023)...\n")

    for year in range(START_YEAR, END_YEAR + 1):
        success = download_fars_year(year)

    print("\nDONE! All relevant files downloaded and filtered.")
