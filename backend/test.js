const axios = require('axios');
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://developer:nikhil2857@cluster0.hbnaqbi.mongodb.net/personalos?retryWrites=true&w=majority&appName=Cluster0')
.then(async () => {
  const IntegrationProfile = require('./dist/models/IntegrationProfile').default;
  const GithubService = require('./dist/services/githubService').GithubService;
  const ip = await IntegrationProfile.findOne({ githubToken: { $exists: true } });
  const token = ip.githubToken;
  
  const pkg = await GithubService.getRepoFileContent(token, 'nikhilkumar905', 'Crowd-source-Disaster-Management', 'package.json');
  console.log('pkg length:', pkg ? pkg.length : 0);
  
  const tree = await GithubService.getRepoTree(token, 'nikhilkumar905', 'Crowd-source-Disaster-Management', 'main');
  console.log('tree length:', tree.length);
  
  process.exit(0);
});
