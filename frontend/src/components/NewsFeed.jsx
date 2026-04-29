import React from 'react';

const NewsFeed = ({ articles }) => {
    if (!articles || articles.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
                <p className="text-gray-500">No recent business news available at the moment.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
                <a 
                    key={index} 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                >
                    {article.urlToImage && (
                        <div className="h-48 overflow-hidden">
                            <img 
                                src={article.urlToImage} 
                                alt={article.title} 
                                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    )}
                    <div className="p-5 flex flex-col flex-grow">
                        <p className="text-xs text-blue-600 font-semibold mb-2 uppercase tracking-wide">
                            {article.source.name}
                        </p>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                            {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">
                            {article.description || 'Click to read more about this business update.'}
                        </p>
                        <div className="text-xs text-gray-400 mt-auto">
                            {new Date(article.publishedAt).toLocaleDateString(undefined, { 
                                year: 'numeric', month: 'long', day: 'numeric' 
                            })}
                        </div>
                    </div>
                </a>
            ))}
        </div>
    );
};

export default NewsFeed;
