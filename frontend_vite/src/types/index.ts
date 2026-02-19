
export interface Trade {
    id: number;
    politician_name: string | null;
    politician_party: string | null;
    politician_state: string | null;
    chamber: string | null;
    ticker: string;
    company_name: string | null;
    transaction_type: string;
    amount_min: number | null;
    amount_max: number | null;
    transaction_date: string | null;
    disclosure_date: string | null;
}

export interface Politician {
    id: number;
    full_name: string;
    chamber: string;
    state: string;
    party: string | null;
    trade_count: number;
    last_trade_date: string | null;
}

export interface StockIndex {
    code: string;
    name: string;
    price: number | null;
    change_pct: number | null;
    change_amount: number | null;
    volume: number | null;
    amount: number | null;
}

export interface GoldPrice {
    international_usd: number | null;
    domestic_cny: number | null;
    exchange_rate: number | null;
    spread_pct: number | null;
    updated_at: string | null;
}

export interface Sector {
    name: string;
    change_pct: number | null;
    leader_stock: string | null;
    leader_change_pct: number | null;
    market_cap: number | null;
    amount: number | null;
}

export interface StockItem {
    code: string;
    name: string;
    price: number | null;
    change_pct: number | null;
    change_amount: number | null;
    volume: number | null;
    amount: number | null;
    high: number | null;
    low: number | null;
    open: number | null;
    turnover_rate: number | null;
    pe_ratio: number | null;
}
