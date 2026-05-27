export const electricityBillSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "Bill_Month": {
      "type": "string",
      "description": "Bill month in format like 'AUG-2025'"
    },
    "Circle": {
      "type": "string",
      "description": "Electricity circle name"
    },
    "Division": {
      "type": "string",
      "description": "Electricity division name"
    },
    "Sub_Division": {
      "type": "string",
      "description": "Electricity sub-division name"
    },
    "Consumer_No": {
      "type": "string",
      "description": "Consumer number (10+ digits)"
    },
    "Consumer_Name": {
      "type": "string",
      "description": "Consumer/company name"
    },
    "Address": {
      "type": "string",
      "description": "Consumer address"
    },
    "Village": {
      "type": "string",
      "description": "Village/Town name"
    },
    "Pin_Code": {
      "type": "string",
      "description": "PIN code (6 digits)"
    },
    "Bill_Date": {
      "type": "string",
      "description": "Bill date in DD/MM/YYYY format"
    },
    "Due_Date": {
      "type": "string",
      "description": "Due date in DD/MM/YYYY format"
    },
    "amount": {
      "type": "string",
      "description": "Total bill amount"
    },
    "GSTIN": {
      "type": "string",
      "description": "GSTIN number"
    },
    "PAN": {
      "type": "string",
      "description": "PAN number"
    },
    "Metering_Type": {
      "type": "string",
      "enum": ["HT", "LT"],
      "description": "Metering type (HT/LT)"
    },
    "Meter_No": {
      "type": "string",
      "description": "Meter number"
    },
    "Feeder_Voltage_KV": {
      "type": "string",
      "description": "Feeder voltage in KV"
    },
    "CT_Ratio": {
      "type": "string",
      "description": "CT ratio"
    },
    "Connected_CT_Ratio": {
      "type": "string",
      "description": "Connected CT ratio"
    },
    "Connected_PT_Ratio": {
      "type": "string",
      "description": "Connected PT ratio"
    },
    "PT_Ratio": {
      "type": "string",
      "description": "PT ratio"
    },
    "Feeder_Name": {
      "type": "string",
      "description": "Feeder name"
    },
    "Feeder Voltage (KV)": {
      "type": "string",
      "description": "Feeder voltage"
    },
    "Substation_Name": {
      "type": "string",
      "description": "Substation name"
    },
    "Urban_Rural": {
      "type": "string",
      "enum": ["Urban", "Rural"],
      "description": "Urban or Rural classification"
    },
    "Express Feeder": {
      "type": "string",
      "enum": ["Yes", "No"],
      "description": "Express feeder indicator"
    },
    "Contract_Demand_KVA": {
      "type": "string",
      "description": "Contract demand in KVA"
    },
    "Connected_Load_KW": {
      "type": "string",
      "description": "Connected load in KW"
    },
    "Sanctioned_Load_KW": {
      "type": "string",
      "description": "Sanctioned load in KW"
    },
    "Scale_Sector": {
      "type": "string",
      "description": "Scale/Sector classification"
    },
    "Activity": {
      "type": "string",
      "description": "Business activity type"
    },
    "CURRENT_CONSUMPTION_DETAILS": {
      "type": "object",
      "properties": {
        "Reading_Details": {
          "type": "object",
          "properties": {
            "KWH": { "type": "string", "description": "KWH consumption" },
            "KVAH": { "type": "string", "description": "KVAH consumption" },
            "RKVAH_LAG": { "type": "string", "description": "RKVAH Lag" },
            "RKVAH_LEAD": { "type": "string", "description": "RKVAH Lead" },
            "KW_MD": { "type": "string", "description": "KW Maximum Demand" },
            "KVA_MD": { "type": "string", "description": "KVA Maximum Demand" }
          }
        },
        "Total_Consumption": { "type": "string", "description": "Total consumption" }
      }
    },
    "TOD_Recorded_MD": {
      "type": "object",
      "properties": {
        "A": { "type": "string", "description": "Zone A recorded MD" },
        "B": { "type": "string", "description": "Zone B recorded MD" },
        "C": { "type": "string", "description": "Zone C recorded MD" },
        "D": { "type": "string", "description": "Zone D recorded MD" }
      }
    },
    "Billing_Demand": {
      "type": "object",
      "properties": {
        "Recorded_MD_except_A_Zone": { "type": "string" },
        "75_percent_of_Highest_Demand_preceding_11months": { "type": "string" },
        "75_percent_of_CD": { "type": "string" },
        "Billed_Demand_KVA": { "type": "string" }
      }
    },
    "TOD_CONSUMPTION_BREAKUP_Units": {
      "type": "object",
      "properties": {
        "A_ZONE": {
          "type": "object",
          "properties": {
            "Units": { "type": "string" },
            "Percentage": { "type": "string" }
          }
        },
        "B_ZONE": {
          "type": "object",
          "properties": {
            "Units": { "type": "string" },
            "Percentage": { "type": "string" }
          }
        },
        "C_ZONE": {
          "type": "object",
          "properties": {
            "Units": { "type": "string" },
            "Percentage": { "type": "string" }
          }
        },
        "D_ZONE": {
          "type": "object",
          "properties": {
            "Units": { "type": "string" },
            "Percentage": { "type": "string" }
          }
        }
      }
    },
    "TOD_CHARGES": {
      "type": "object",
      "properties": {
        "A_ZONE": { "type": "string" },
        "B_ZONE": { "type": "string" },
        "C_ZONE": { "type": "string" },
        "D_ZONE": { "type": "string" },
        "TOTAL_TOD_CHARGES": { "type": "string" }
      }
    },
    "Billing_Demand_Detailed": {
      "type": "object",
      "properties": {
        "Recorded_MD_except_A_Zone": { "type": "string" },
        "75%_of_Highest_Demand_preceding_11months": { "type": "string" },
        "75%_of_CD": { "type": "string" },
        "Billed_Demand_KVA_Max_of_above": { "type": "string" },
        "Note": { "type": "string" }
      }
    },
    "DEBIT_DETAILS": {
      "type": "object",
      "properties": {
        "Demand_Charges_Rs_600_per_KVA": { "type": "string" },
        "Wheeling_Charge_Rs_0_74_per_Unit": { "type": "string" },
        "Energy_Charges": { "type": "string" },
        "TOD_Tariff_EC": { "type": "string" },
        "FAC_Rs_0_30_per_Unit": { "type": "string" },
        "Electricity_Duty": { "type": "string" },
        "Tax_on_Sale_Rs_0_1904_per_Unit": { "type": "string" },
        "Charges_For_Excess_Demand": { "type": "string" },
        "Tax_Collection_at_Source": { "type": "string" },
        "Debit_Bill_Adjustment": { "type": "string" },
        "TOTAL_CURRENT_BILL_AS_PER_TARIFF": { "type": "string" },
        "CREDIT_DETAILS": {
          "type": "object",
          "properties": {
            "Incremental_Consumption_Rebate": { "type": "string" },
            "Prompt_Payment_Discount": { "type": "string" },
            "Region_Subsidy": { "type": "string" },
            "Bulk_Consumption_Rebate": { "type": "string" }
          }
        }
      }
    },
    "Arrears": {
      "type": "object",
      "properties": {
        "Principal_Arrears": { "type": "string" },
        "Interest_Arrears": { "type": "string" }
      }
    },
    "Total_Bill_Amount_Payable_Rs": {
      "type": "object",
      "properties": {
        "Before_PPD": { "type": "string" },
        "Amount_In_Words": { "type": "string" }
      }
    },
    "INCENTIVES_AND_REBATES": {
      "type": "object",
      "properties": {
        "Total_Incentives_Rebates": { "type": "string" },
        "BCR": { "type": "string" },
        "ICR": { "type": "string" },
        "PPD": { "type": "string" },
        "Payables": { "type": "string" },
        "Region_Subsidy": { "type": "string" }
      }
    },
    "ENERGY_CHARGE_DETAILS": {
      "type": "object",
      "properties": {
        "Industrial": {
          "type": "object",
          "properties": {
            "Units": { "type": "string" },
            "Rate": { "type": "string" },
            "Charges_Rs": { "type": "string" }
          }
        },
        "Residential": {
          "type": "object",
          "properties": {
            "Units": { "type": "string" },
            "Rate": { "type": "string" },
            "Charges_Rs": { "type": "string" }
          }
        },
        "Commercial": {
          "type": "object",
          "properties": {
            "Units": { "type": "string" },
            "Rate": { "type": "string" },
            "Charges_Rs": { "type": "string" }
          }
        }
      }
    },
    "ELECTRICITY_DUTY_DETAILS": {
      "type": "object",
      "properties": {
        "Industrial": {
          "type": "object",
          "properties": {
            "E_D_on_Rs": { "type": "string" },
            "Rate_Percent": { "type": "string" },
            "Amount_Rs": { "type": "string" }
          }
        },
        "Residential": {
          "type": "object",
          "properties": {
            "E_D_on_Rs": { "type": "string" },
            "Rate_Percent": { "type": "string" },
            "Amount_Rs": { "type": "string" }
          }
        },
        "Commercial": {
          "type": "object",
          "properties": {
            "E_D_on_Rs": { "type": "string" },
            "Rate_Percent": { "type": "string" },
            "Amount_Rs": { "type": "string" }
          }
        }
      }
    },
    "Total Bill Amount Payable Rs": {
      "type": "object",
      "properties": {
        "Before_PPD": { "type": "string" },
        "Amount_In_Words": { "type": "string" }
      }
    },
    "Follow_us_on": {
      "type": "array",
      "items": { "type": "string" }
    },
    "Signature_Not_Verified": { "type": "string" },
    "Express_Feeder": { "type": "string" }
  },
  "required": ["Consumer_No", "Consumer_Name", "Bill_Date", "Due_Date"]
};

