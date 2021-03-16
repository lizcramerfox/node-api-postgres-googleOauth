const express = require('express')
const google = require('googleapis').google
const jwt = require('jsonwebtoken')
const OAuth2 = google.auth.OAuth2
const CONFIG = require('./config')

const app = express()
const db = require('./queries')

const cookieParser = require('cookie-parser')

app.use(cookieParser())
app.use(express.json())
app.use(
  express.urlencoded({
    extended: true,
  })
)
app.set('view engine', 'ejs');
app.set('views', __dirname);

app.get('/', (req, res) => {
  const oauth2Client = new OAuth2(CONFIG.oauth2Credentials.client_id, CONFIG.oauth2Credentials.client_secret, CONFIG.oauth2Credentials.redirect_uris[0]);
  const loginLink = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: CONFIG.oauth2Credentials.scopes
  })
  return res.render('index', { loginLink: loginLink })
})

app.get('/auth_callback', (req, res) => {
  // create OAuth2 client object from credentials provided by user
  const oauth2Client = new OAuth2(CONFIG.oauth2Credentials.client_id, CONFIG.oauth2Credentials.client_secret, CONFIG.oauth2Credentials.redirect_uris[0]);
  if (req.query.error) {
    // if permissions not given, redirect the user
    return res.redirect('/')
  } else {
    // if permissions given, get token
    oauth2Client.getToken(req.query.code, (err, token) => {
      if (err) {
        return res.redirect('/')
      }
      // store credentials in a jsonwebtoken as a cookie named "jwt"
      res.cookie('jwt', jwt.sign(token, CONFIG.JWTsecret))
      return res.redirect('/get_some_data')
    })
  }
})

// app.get('/get_some_data', (req, res) => {
//   // if not logged in, redirect to home
//   if (!req.cookies.jwt) {
//     return res.redirect('/')
//   }
//   // create OAuth2 client object from credentials provided by user
//   const oauth2Client = new OAuth2(CONFIG.oauth2Credentials.client_id, CONFIG.oauth2Credentials.client_secret, CONFIG.oauth2Credentials.redirect_uris[0])
//   // get YouTube servie
//   const service = google.youtube('v3')
//   // list up to 5 of the user's youtube subscriptions
//   service.subscriptions.list({
//     auth: oauth2Client,
//     mine: true,
//     part: 'snippet, contentDetails',
//     maxResults: 5,
//   }).then(response => {
//     // render the data view & pass subscriptions to it
//     return res.render('data', { subscriptions: response.data.items })
//   })
// })

app.get('/get_some_data', function (req, res) {
  if (!req.cookies.jwt) {
    // We haven't logged in
    return res.redirect('/');
  }
  // Create an OAuth2 client object from the credentials in our config file
  const oauth2Client = new OAuth2(CONFIG.oauth2Credentials.client_id, CONFIG.oauth2Credentials.client_secret, CONFIG.oauth2Credentials.redirect_uris[0]);
  // Add this specific user's credentials to our OAuth2 client
  oauth2Client.credentials = jwt.verify(req.cookies.jwt, CONFIG.JWTsecret);
  // Get the youtube service
  const service = google.youtube('v3');
  // Get five of the user's subscriptions (the channels they're subscribed to)
  service.subscriptions.list({
    auth: oauth2Client,
    mine: true,
    part: 'snippet,contentDetails',
    maxResults: 5
  }).then(response => {
    // Render the data view, passing the subscriptions to it
    return res.render('data', { subscriptions: response.data.items });
  });
});

// app.get('/users', db.getUsers)
// app.get('/users/:id', db.getUserById)
// app.post('/users', db.createUser)
// app.put('/users/:id', db.updateUser)
// app.delete('/users/:id', db.deleteUser)

app.listen(CONFIG.port, () => {
  console.log(`App running on port ${CONFIG.port}`)
})

