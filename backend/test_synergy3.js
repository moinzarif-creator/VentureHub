const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User'); // Required
const InvestorProfile = require('./models/InvestorProfile');
const EntrepreneurProfile = require('./models/EntrepreneurProfile');
const Pitch = require('./models/Pitch');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected");
    
    const pitch = await Pitch.findOne({}).populate('entrepreneurId');
    const entrepreneurProfile = await EntrepreneurProfile.findOne({ user: pitch.entrepreneurId._id });
    
    console.log("Embedding length:", entrepreneurProfile.embedding.length);

    const matchPipeline = [
        {
            $vectorSearch: {
                index: 'vector_index',
                path: 'embedding',
                queryVector: entrepreneurProfile.embedding,
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

    try {
        const topInvestors = await InvestorProfile.aggregate(matchPipeline);
        console.log("Found investors:", topInvestors.length);
        console.log(topInvestors);
    } catch(err) {
        console.error(err);
    }

    process.exit(0);
});
