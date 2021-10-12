const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const dotenv = require('dotenv');
// const Logger = require("./libs/logger");
// const configuredMorgan = require("./config/morgan");
const apiRoute = require('./routes/api')
dotenv.config();

const db_url = process.env.MONGODB_URL;
const PORT = process.env.PORT || 28017;
console.log(`HTTP Serving on port: ${PORT}`);

const app = express();

// app.use(configuredMorgan);

app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static('client'));
// routes
app.use(apiRoute);

// DATABASE CONNECTION
const connectionParams={
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true 
}

mongoose.connect(db_url, connectionParams)
.then(() => {
    console.log(`Connected to database @ BudgetTracker.uvvp5.mongodb.net`);
    app.listen(PORT, () => {
        console.log('stop logging');
        // console.log('Server is running with port:'+PORT);
    });
})
.catch( (err) => {
    console.log(`Error connecting to the database. \n${err}`);
})