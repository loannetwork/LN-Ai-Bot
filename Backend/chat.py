import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from openai import AsyncOpenAI
from fastapi import Request
from typing import List, Dict, Optional, Tuple
from functools import lru_cache
import logging

# Configuration
API_KEY = "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"
# BASE_FOLDER = r"C:\Users\user\OneDrive\LN\AI\v1"
PROMPT_TEXT_FILE = rf"/Users/harshitagarwal/Harshit Vscode/FastApi/final_prompt.txt"
FILE_PATH = rf"/Users/harshitagarwal/Harshit Vscode/FastApi/Lender_rates_testing_updated_sheet.xlsx"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedBankDataManager:
    def __init__(self):
        self.banks_data = {}
        
    def load_all_data(self):
        """Load all bank data once at startup with enhanced parsing"""
        logger.info("Loading enhanced bank data...")
        
        xls = pd.ExcelFile(FILE_PATH)
        
        for bank_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=bank_name, header=None)
            
            bank_data = self._parse_bank_data_enhanced(df, bank_name)
            self.banks_data[bank_name] = bank_data
        
        logger.info(f"Loaded {len(self.banks_data)} banks with enhanced parsing")
    
    def _find_rate_table_start(self, df: pd.DataFrame) -> Optional[Tuple[int, int]]:
        """Find rate table header and data start rows by content"""
        header_row = None
        data_start = None
        
        for i in range(len(df)):
            if i >= len(df):
                break
                
            cell_value = str(df.iloc[i, 0]).strip().lower() if pd.notna(df.iloc[i, 0]) else ""
            
            # Look for header row
            if cell_value == 'min_cibil':
                header_row = i
                # Data should start next row
                data_start = i + 1
                break
        
        return (header_row, data_start) if header_row is not None else (None, None)
    
    def _standardize_employment_type(self, emp_type: str) -> Dict[str, str]:
        """Standardize employment types with both original and standardized versions"""
        if not emp_type:
            return {"original": "", "standardized": "Unknown"}
        
        original = emp_type.strip()
        type_lower = original.lower()
        
        if type_lower == 's':
            standardized = "Salaried"
        elif 'sal' in type_lower and 'sep' not in type_lower and 'senp' not in type_lower:
            standardized = "Salaried"
        elif 'sep' in type_lower or 'senp' in type_lower:
            standardized = "Self Employed"
        elif 'all' in type_lower and ('sal' in type_lower or 'sep' in type_lower):
            standardized = "All Types"
        else:
            standardized = f"Other ({original})"
        
        return {"original": original, "standardized": standardized}
    
    def _calculate_all_rates(self, base_rate: str, women_discount: str, rtm_discount: str, bank_name: str = "") -> Dict:
        """Calculate all possible rate combinations"""
        
        try:
            # Handle different formats of rate data
            base_clean = str(base_rate).replace('%', '').strip() if base_rate else '0'
            women_clean = str(women_discount).replace('%', '').strip() if women_discount else '0'
            rtm_clean = str(rtm_discount).replace('%', '').strip() if rtm_discount else '0'
            
            base = float(base_clean) if base_clean and base_clean.lower() not in ['na', 'n/a', '', 'nan'] else 0.0
            women = float(women_clean) if women_clean and women_clean.lower() not in ['na', 'n/a', '', '0.00', 'nan'] else 0.0
            rtm = float(rtm_clean) if rtm_clean and rtm_clean.lower() not in ['na', 'n/a', '', '0.00', 'nan'] else 0.0
            
            # Check if rates seem too low (might be in decimal format instead of percentage)
            if base > 0 and base < 1:
                # If it's less than 1, it might already be in decimal form, so convert to percentage
                base = base * 100
            
            # Apply same conversion logic to discounts
            if women > 0 and women < 1:
                women = women * 100
            if rtm > 0 and rtm < 1:
                rtm = rtm * 100
            
            result = {
                'base_rate': f"{base:.2f}%",
                'women_rate': f"{(base - women):.2f}%",
                'rtm_rate': f"{(base - rtm):.2f}%",
                'women_rtm_rate': f"{(base - women - rtm):.2f}%",
                'best_rate': f"{(base - max(women, rtm, women + rtm)):.2f}%",
                'women_discount_value': f"{women:.2f}%" if women > 0 else "0.00%",
                'rtm_discount_value': f"{rtm:.2f}%" if rtm > 0 else "0.00%"
            }
            
            # Temporary debug print
            print(f"BANK: {bank_name} | DEBUG RATES: Base={base}, Women={women}, RTM={rtm}")
            print(f"BANK: {bank_name} | RESULT: {result}")
            
            return result
            
        except (ValueError, AttributeError) as e:
            return {
                'base_rate': base_rate,
                'women_rate': None,
                'rtm_rate': None,
                'women_rtm_rate': None,
                'best_rate': base_rate,
                'women_discount_value': "0.00%",
                'rtm_discount_value': "0.00%"
            }
    
    def _parse_basic_info_by_content(self, df: pd.DataFrame) -> Dict:
        """Parse basic info by searching for field names rather than positions"""
        basic_info = {}
        
        for i in range(min(30, len(df))):
            if pd.notna(df.iloc[i, 0]) and str(df.iloc[i, 0]).strip():
                field = str(df.iloc[i, 0]).strip().lower()
                value = str(df.iloc[i, 1]).strip() if pd.notna(df.iloc[i, 1]) else ""
                extra = str(df.iloc[i, 2]).strip() if pd.notna(df.iloc[i, 2]) else ""
                
                if 'offer name' in field:
                    basic_info['offer'] = value
                elif 'min cibil' in field:
                    basic_info['min_cibil'] = value
                    if extra and extra not in ['', 'na']:
                        basic_info['min_cibil_note'] = extra
                elif 'processing fee' in field:
                    basic_info['processing_fee'] = value
                    if extra and extra not in ['', 'na']:
                        basic_info['processing_fee_note'] = extra
                elif 'max tenure' in field:
                    basic_info['max_tenure'] = value
                elif 'benefits' in field:
                    benefit_text = value
                    if extra and extra not in ['', 'na']:
                        benefit_text += f" ({extra})"
                    basic_info['benefits'] = benefit_text
                elif 'max borrower age' in field:
                    basic_info['max_age'] = value
                    if extra and extra not in ['', 'na']:
                        basic_info['max_age_note'] = extra
                elif 'standard foir' in field:
                    basic_info['standard_foir'] = value
        
        return basic_info
    
    def _parse_bank_data_enhanced(self, df: pd.DataFrame, bank_name: str) -> Dict:
        """Enhanced bank data parsing with content-based detection"""
        bank_data = {
            'name': bank_name,
            'basic_info': {},
            'top_rates': [],
            'all_rates': []
        }
        
        # Parse basic info by content
        bank_data['basic_info'] = self._parse_basic_info_by_content(df)
        
        # Find rate table by content
        header_row, data_start = self._find_rate_table_start(df)
        
        if data_start is None:
            logger.warning(f"Rate table not found for {bank_name}")
            return bank_data
        
        # Parse rates with enhanced structure
        rates = []
        
        for i in range(data_start, len(df)):
            if i >= len(df):
                break
                
            # Check if this is a valid rate row (starts with CIBIL score)
            if pd.notna(df.iloc[i, 0]) and str(df.iloc[i, 0]).strip().isdigit():
                try:
                    row = df.iloc[i]
                    
                    # Extract all columns
                    min_cibil = int(row[0])
                    max_cibil = int(row[1]) if pd.notna(row[1]) and str(row[1]).strip().isdigit() else 999
                    emp_type_raw = str(row[2]).strip() if pd.notna(row[2]) else ""
                    emp_category = str(row[3]).strip() if pd.notna(row[3]) else ""
                    loan_amount_min = str(row[4]).strip() if pd.notna(row[4]) else ""
                    loan_amount_max = str(row[5]).strip() if pd.notna(row[5]) else ""
                    base_rate = str(row[6]).strip() if pd.notna(row[6]) else ""
                    women_discount = str(row[7]).strip() if pd.notna(row[7]) else "0.00%"
                    rtm_discount = str(row[8]).strip() if pd.notna(row[8]) else "0.00%"  # Ready-to-move discount
                    
                    # Standardize employment type
                    emp_type_info = self._standardize_employment_type(emp_type_raw)
                    
                    # Calculate all rate combinations
                    rate_calculations = self._calculate_all_rates(base_rate, women_discount, rtm_discount, bank_name)
                    
                    rate_data = {
                        'cibil_min': min_cibil,
                        'cibil_max': max_cibil,
                        'emp_type_original': emp_type_info['original'],
                        'emp_type_standardized': emp_type_info['standardized'],
                        'emp_category': emp_category,
                        'loan_amount_min': loan_amount_min,
                        'loan_amount_max': loan_amount_max,
                        'base_rate': base_rate,
                        'women_discount': women_discount,
                        'rtm_discount': rtm_discount,
                        'rate_calculations': rate_calculations
                    }
                    rates.append(rate_data)
                    
                except (ValueError, IndexError) as e:
                    logger.debug(f"Error parsing rate row {i} for {bank_name}: {e}")
                    continue
        
        # Sort rates by CIBIL (higher CIBIL first for better rates)
        rates.sort(key=lambda x: x['cibil_min'], reverse=True)
        
        # Store rates
        bank_data['all_rates'] = rates
        bank_data['top_rates'] = rates[:8]  # Top 8 for context efficiency
        
        return bank_data
    
    @lru_cache(maxsize=200)
    def get_context_for_query(self, query: str) -> str:
        """Get relevant context with enhanced rate information"""
        query_lower = query.lower()
        
        # Find mentioned banks (handle variations like "sbi", "hdfc", etc.)
        mentioned_banks = []
        for bank_name in self.banks_data.keys():
            bank_simple = bank_name.lower().replace(' (new)', '').replace('(new)', '').replace(' ', '')
            if bank_simple in query_lower or bank_name.lower() in query_lower:
                mentioned_banks.append(bank_name)
        
        # If no specific banks mentioned, determine relevant ones
        if not mentioned_banks:
            if any(word in query_lower for word in ['compare', 'all', 'best', 'lowest', 'cheapest']):
                mentioned_banks = list(self.banks_data.keys())[:5]  # Top 5 for comparison
            else:
                mentioned_banks = list(self.banks_data.keys())[:3]  # Top 3 for general queries
        
        # Build enhanced context
        context_parts = []
        
        for bank_name in mentioned_banks:
            bank = self.banks_data[bank_name]
            
            context_parts.append(f"## {bank_name}")
            
            # Basic information
            basic = bank['basic_info']
            context_parts.append(f"Offer: {basic.get('offer', 'Home Loan')}")
            context_parts.append(f"Min CIBIL: {basic.get('min_cibil', 'N/A')}")
            context_parts.append(f"Processing Fee: {basic.get('processing_fee', 'N/A')}")
            context_parts.append(f"Max Tenure: {basic.get('max_tenure', 'N/A')} years")
            
            # Add benefits if available
            if basic.get('benefits'):
                context_parts.append(f"Benefits: {basic['benefits']}")
            
            # Enhanced rate information
            context_parts.append("\nInterest Rates:")
            for idx, rate in enumerate(bank['top_rates']):
                calc = rate['rate_calculations']
                
                # Build rate display string
                rate_line = f"  CIBIL {rate['cibil_min']}-{rate['cibil_max']} "
                rate_line += f"({rate['emp_type_original']} → {rate['emp_type_standardized']}): "
                
                # Show rate structure
                rate_details = [f"Base: {calc['base_rate']}"]
                rate_details.append(f"Women: {calc['women_rate']}")
                rate_details.append(f"RTM: {calc['rtm_rate']}")
                rate_details.append(f"Best: {calc['best_rate']}")
                
                # Add discount info if available
                if calc['women_discount_value'] != "0.00%" or calc['rtm_discount_value'] != "0.00%":
                    discount_info = []
                    if calc['women_discount_value'] != "0.00%":
                        discount_info.append(f"Women Disc: {calc['women_discount_value']}")
                    if calc['rtm_discount_value'] != "0.00%":
                        discount_info.append(f"RTM Disc: {calc['rtm_discount_value']}")
                    rate_details.append(f"({', '.join(discount_info)})")
                
                rate_line += " | ".join(rate_details)
                
                # Add loan amount range if available
                if rate['loan_amount_min'] and rate['loan_amount_max']:
                    rate_line += f" | Loan: {rate['loan_amount_min']}-{rate['loan_amount_max']}"
                
                context_parts.append(rate_line)
            
            context_parts.append("")
        
        final_context = "\n".join(context_parts)
        
        return final_context
    
    def get_best_rates_analysis(self, cibil_score: int = 750, employment_type: str = "All") -> str:
        """Get best rates analysis across all banks"""
        matching_rates = []
        
        for bank_name, bank_data in self.banks_data.items():
            for rate in bank_data['all_rates']:
                if rate['cibil_min'] <= cibil_score <= rate['cibil_max']:
                    # Check employment type match
                    if (employment_type == "All" or 
                        employment_type.lower() in rate['emp_type_standardized'].lower() or
                        rate['emp_type_standardized'] == "All Types"):
                        
                        calc = rate['rate_calculations']
                        matching_rates.append({
                            'bank': bank_name,
                            'cibil_range': f"{rate['cibil_min']}-{rate['cibil_max']}",
                            'employment': f"{rate['emp_type_original']} ({rate['emp_type_standardized']})",
                            'base_rate': calc['base_rate'],
                            'best_rate': calc['best_rate'],
                            'women_discount': calc['women_discount_value'],
                            'rtm_discount': calc['rtm_discount_value']
                        })
        
        # Sort by best rate
        matching_rates.sort(key=lambda x: float(x['best_rate'].replace('%', '')))
        
        # Build analysis
        analysis_parts = [
            f"Best Rates Analysis for CIBIL {cibil_score} ({employment_type}):\n",
            "Rank | Bank | Employment | Base Rate | Best Rate | Discounts"
        ]
        
        for i, rate in enumerate(matching_rates[:10], 1):
            discounts = []
            if rate['women_discount'] != "0.00%":
                discounts.append(f"Women: {rate['women_discount']}")
            if rate['rtm_discount'] != "0.00%":
                discounts.append(f"RTM: {rate['rtm_discount']}")
            
            discount_text = ", ".join(discounts) if discounts else "None"
            
            analysis_parts.append(
                f"{i:2d}. | {rate['bank'][:15]:15s} | {rate['employment'][:20]:20s} | "
                f"{rate['base_rate']:8s} | {rate['best_rate']:8s} | {discount_text}"
            )
        
        return "\n".join(analysis_parts)

class EnhancedBankChatbot:
    def __init__(self, data_manager: EnhancedBankDataManager):
        self.data_manager = data_manager
        self.client = AsyncOpenAI(api_key=API_KEY)
        
        # Load prompt
        with open(PROMPT_TEXT_FILE, "r", encoding="utf-8") as f:
            self.base_prompt = f.read()
    
    def _limit_conversation_history(self, conversation_history: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Limit conversation history to last 10 exchanges (20 messages)"""
        if len(conversation_history) <= 20:
            return conversation_history
        
        # Keep last 20 messages (10 user + 10 assistant exchanges)
        return conversation_history[-20:]
    
    def _analyze_query_for_rates(self, query: str) -> Optional[str]:
        """Analyze if query is asking for rate comparison and provide enhanced analysis"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['best', 'compare', 'lowest', 'cheapest', 'rate']):
            # Extract CIBIL if mentioned
            import re
            cibil_match = re.search(r'cibil\s*(?:score)?\s*(?:of\s*)?(\d+)', query_lower)
            cibil_score = int(cibil_match.group(1)) if cibil_match else 750
            
            # Extract employment type
            employment_type = "All"
            if any(word in query_lower for word in ['salaried', 'sal']):
                employment_type = "Salaried"
            elif any(word in query_lower for word in ['self employed', 'sep', 'senp']):
                employment_type = "Self Employed"
            
            return self.data_manager.get_best_rates_analysis(cibil_score, employment_type)
        
        return None
    
    async def process_query(self, conversation_history: List[Dict[str, str]]) -> str:
        """Process user query with enhanced rate analysis"""
        
        # Limit conversation history to save tokens
        limited_history = self._limit_conversation_history(conversation_history)
        
        # Get latest user message
        latest_query = ""
        for msg in reversed(limited_history):
            if msg.get("role") == "user":
                latest_query = msg.get("content", "")
                break
        
        # Check if this is a rate analysis query
        rate_analysis = self._analyze_query_for_rates(latest_query)
        
        # Get relevant context
        context = self.data_manager.get_context_for_query(latest_query)
        
        # Add rate analysis if applicable
        if rate_analysis:
            context = rate_analysis + "\n\n" + context
        
        system_instruction = f"""
{self.base_prompt}

Enhanced Bank Data:
{context}

Instructions:
- Provide accurate answers based on the enhanced bank data above
- Be specific about CIBIL ranges, loan amounts, and employment categories
- Follow all rate interpretation guidelines from your base instructions
"""
        
        messages = [{"role": "system", "content": system_instruction}] + limited_history
        
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=2500,
            temperature=0.3,
        )
        
        return response.choices[0].message.content

# FastAPI Application
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
data_manager = None
chatbot = None

@app.on_event("startup")
async def startup_event():
    """Initialize enhanced chatbot on startup"""
    global data_manager, chatbot
    
    data_manager = EnhancedBankDataManager()
    data_manager.load_all_data()
    chatbot = EnhancedBankChatbot(data_manager)
    
    logger.info("Enhanced chatbot ready!")

@app.post("/chat", response_class=PlainTextResponse)
async def chat(request: Request):
    """Main chat endpoint with enhanced processing"""
    body = await request.json()
    conversation_history = body.get("messages", [])
    
    response = await chatbot.process_query(conversation_history)
    
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)