const mongoose = require('mongoose');
const dotenv = require('dotenv');
const InvestorProfile = require('./models/InvestorProfile');
const EntrepreneurProfile = require('./models/EntrepreneurProfile');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const invCount = await InvestorProfile.countDocuments({ "embedding.0": { $exists: true } });
    const entCount = await EntrepreneurProfile.countDocuments({ "embedding.0": { $exists: true } });
    console.log(`Investors with embeddings: ${invCount}`);
    console.log(`Entrepreneurs with embeddings: ${entCount}`);
    
    // Test checkDirectSynergy on a valid pitch with an embedding
    const Pitch = require('./models/Pitch');
    
    // Find an entrepreneur with an embedding
    const validEnt = await EntrepreneurProfile.findOne({ "embedding.0": { $exists: true } });
    if (validEnt) {
        const pitch = await Pitch.findOne({ entrepreneurId: validEnt.user });
        if (pitch) {
            console.log("Found pitch for valid entrepreneur, testing vector search...");
            const matchPipeline = [
                {
                    $vectorSearch: {
                        index: 'vector_index',
                        path: 'embedding',
                        queryVector: validEnt.embedding,
                        numCandidates: 100,
                        limit: 5
                    }
                },
                {
                    $project: {
                        user: 1,
                        vectorScore: { $meta: "vectorSearchScore" }
                    }
                }
            ];
            const topInvestors = await InvestorProfile.aggregate(matchPipeline);
            console.log(`Found ${topInvestors.length} top investors. Scores:`);
            topInvestors.forEach(inv => console.log(`${inv.user} - Score: ${inv.vectorScore}`));
        } else {
            console.log("No pitch found for that entrepreneur.");
        }
    } else {
        console.log("No entrepreneur with embeddings found.");
    }
    
    process.exit(0);
});
