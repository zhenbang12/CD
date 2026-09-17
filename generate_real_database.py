import json
import sqlite3
import os
import re

# Read initialData.js and extract tables
def parse_initial_data(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the object assigned to INITIAL_DATA
    # Remove 'export const INITIAL_DATA = ' and trailing ';'
    start_idx = content.find('export const INITIAL_DATA = {')
    if start_idx == -1:
        start_idx = content.find('export const INITIAL_DATA =')
    
    # We can use a small node script to serialize INITIAL_DATA to JSON cleanly!
    return None

def extract_via_node():
    script = '''
    import { INITIAL_DATA } from './js/data/initialData.js';
    import fs from 'fs';
    fs.writeFileSync('temp_data.json', JSON.stringify(INITIAL_DATA, null, 2));
    '''
    with open('temp_extract.mjs', 'w', encoding='utf-8') as f:
        f.write(script)
    
    os.system('node temp_extract.mjs')
    
    with open('temp_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if os.path.exists('temp_extract.mjs'):
        os.remove('temp_extract.mjs')
    if os.path.exists('temp_data.json'):
        os.remove('temp_data.json')
        
    return data

def build_databases():
    data = extract_via_node()
    print("Extracted collections:", list(data.keys()))
    
    # 1. Generate SQLite Database (ecohotel.db)
    sqlite_path = r'd:\CD\ecohotel.db'
    if os.path.exists(sqlite_path):
        os.remove(sqlite_path)
        
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    
    # 2. Prepare Oracle SQL DDL script (oracle_schema.sql)
    oracle_lines = []
    oracle_lines.append("-- ========================================================")
    oracle_lines.append("-- EcoHotel OS - Oracle SQL Relational Database Schema")
    oracle_lines.append("-- Course: BMSE2073 Software Design and Architecture")
    oracle_lines.append("-- Mandate: Visit Malaysia 2026 (VM2026 Directive)")
    oracle_lines.append("-- ========================================================\n")
    
    def sql_type(val):
        if isinstance(val, int):
            return "NUMBER(10)", "INTEGER"
        elif isinstance(val, float):
            return "NUMBER(12,2)", "REAL"
        elif isinstance(val, bool):
            return "NUMBER(1)", "INTEGER"
        else:
            return "VARCHAR2(255)", "TEXT"
            
    # Key tables matching PDF specifications
    table_mappings = {
        'users': 'USERS',
        'baselines': 'BASELINES',
        'complianceLogs': 'COMPLIANCE_LOG',
        'inventory': 'RAW_INGREDIENTS',
        'foodWasteLogs': 'FOOD_WASTE_LOGS',
        'dishes': 'DISHES',
        'plateWasteLogs': 'PLATE_WASTE',
        'reservations': 'RESERVATIONS',
        'prepRecommendations': 'PREP_RECOMMENDATIONS',
        'rooms': 'ROOM_SCHEDULE',
        'ecoVouchers': 'ECO_VOUCHERS',
        'guestInteractions': 'GUEST_INTERACTION_LOG',
        'utilityMeters': 'METER_READINGS',
        'repairTickets': 'REPAIR_TICKETS',
        'technicians': 'TECHNICIANS',
        'auditLogs': 'USER_AUDIT',
        'monthlySavings': 'MONTHLY_SAVINGS'
    }
    
    for coll_key, tbl_name in table_mappings.items():
        records = data.get(coll_key, [])
        if not records or not isinstance(records, list) or len(records) == 0:
            continue
            
        # Discover columns from first record
        sample = records[0]
        cols = []
        oracle_cols = []
        sqlite_cols = []
        
        for k, v in sample.items():
            if isinstance(v, (dict, list)):
                v_str = json.dumps(v)
                o_t, s_t = "VARCHAR2(1000)", "TEXT"
            else:
                o_t, s_t = sql_type(v)
                
            if k.lower() == 'id':
                oracle_cols.append(f"    {k.upper()} VARCHAR2(64) PRIMARY KEY")
                sqlite_cols.append(f"    {k} TEXT PRIMARY KEY")
            else:
                oracle_cols.append(f"    {k.upper()} {o_t}")
                sqlite_cols.append(f"    {k} {s_t}")
            cols.append(k)
            
        # Write Oracle SQL DDL
        oracle_lines.append(f"-- Table: {tbl_name}")
        oracle_lines.append(f"CREATE TABLE {tbl_name} (")
        oracle_lines.append(",\n".join(oracle_cols))
        oracle_lines.append(");\n")
        
        # Write SQLite DDL
        sqlite_ddl = f"CREATE TABLE IF NOT EXISTS {tbl_name} (\n" + ",\n".join(sqlite_cols) + "\n);"
        cursor.execute(sqlite_ddl)
        
        # Insert records into SQLite & generate Oracle INSERTs
        for r in records:
            col_names = []
            values = []
            oracle_vals = []
            
            for c in cols:
                val = r.get(c, None)
                if isinstance(val, (dict, list)):
                    val = json.dumps(val)
                col_names.append(c)
                values.append(val)
                
                if val is None:
                    oracle_vals.append("NULL")
                elif isinstance(val, (int, float)):
                    oracle_vals.append(str(val))
                elif isinstance(val, bool):
                    oracle_vals.append("1" if val else "0")
                else:
                    escaped = str(val).replace("'", "''")
                    oracle_vals.append(f"'{escaped}'")
                    
            placeholders = ",".join(["?" for _ in col_names])
            cursor.execute(f"INSERT OR REPLACE INTO {tbl_name} ({','.join(col_names)}) VALUES ({placeholders})", values)
            
            oracle_insert = f"INSERT INTO {tbl_name} ({','.join([c.upper() for c in col_names])}) VALUES ({','.join(oracle_vals)});"
            oracle_lines.append(oracle_insert)
            
        oracle_lines.append("\nCOMMIT;\n")
        
    conn.commit()
    conn.close()
    
    oracle_file = r'd:\CD\oracle_schema.sql'
    with open(oracle_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(oracle_lines))
        
    print(f"Created SQLite database: {sqlite_path}")
    print(f"Created Oracle SQL script: {oracle_file}")

if __name__ == '__main__':
    build_databases()
