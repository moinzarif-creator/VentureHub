import React, { useEffect, useRef, memo } from 'react';

const StockTicker = () => {
    const container = useRef();

    useEffect(() => {
        // Clear container first to avoid duplicate widgets on re-renders
        if (container.current) {
            container.current.innerHTML = '';
        }

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
        {
            "symbols": [
                {
                    "proName": "FOREXCOM:SPXUSD",
                    "title": "S&P 500 Index"
                },
                {
                    "proName": "FOREXCOM:NSXUSD",
                    "title": "US 100 Cash Indices"
                },
                {
                    "proName": "FX_IDC:EURUSD",
                    "title": "EUR to USD"
                },
                {
                    "proName": "BITSTAMP:BTCUSD",
                    "title": "Bitcoin"
                },
                {
                    "proName": "BITSTAMP:ETHUSD",
                    "title": "Ethereum"
                }
            ],
            "showSymbolLogo": true,
            "isTransparent": true,
            "displayMode": "adaptive",
            "colorTheme": "light",
            "locale": "en"
        }`;
        
        if (container.current) {
            container.current.appendChild(script);
        }
    }, []);

    return (
        <div className="w-full bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm p-2 mb-8">
            <div className="tradingview-widget-container" ref={container}>
                <div className="tradingview-widget-container__widget"></div>
            </div>
        </div>
    );
};

export default memo(StockTicker);
