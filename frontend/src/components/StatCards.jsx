import React from 'react';

const StatCards = ({ stats }) => {
    const cards = [
        { title: 'Registered Investors', value: stats.investors, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Entrepreneurs', value: stats.entrepreneurs, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Total Pitches', value: stats.pitches, color: 'text-purple-600', bg: 'bg-purple-100' },
        { title: 'Active Bids', value: stats.activeBids, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { title: 'Closed Deals', value: stats.closedBids, color: 'text-teal-600', bg: 'bg-teal-100' },
        { title: 'Total Offers', value: stats.totalBids, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {cards.map((card, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center border border-gray-100 hover:shadow-md transition-shadow">
                    <div className={`p-3 rounded-full ${card.bg} mb-3`}>
                        <h3 className={`text-2xl font-bold ${card.color}`}>{card.value !== undefined ? card.value : '-'}</h3>
                    </div>
                    <p className="text-sm text-gray-600 text-center font-medium">{card.title}</p>
                </div>
            ))}
        </div>
    );
};

export default StatCards;
