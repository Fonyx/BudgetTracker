const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");
const compression = require("compression");
const dotenv = require('dotenv');
const Logger = require("./libs/logger");
const configuredMorgan = require("./config/morgan");
dotenv.config();

const db_url = process.env.MONGODB_URL;
const PORT = process.env.SERVER_PORT;

const app = express();

// app.use(logger("dev"));
app.use(configuredMorgan);

app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static("public"));
// routes
app.use(require("./routes/api.js"));

// DATABASE CONNECTION
const connectionParams={
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true 
}

mongoose.connect(db_url, connectionParams)
.then(() => {
    Logger.info(`Connected to database @ BudgetTracker.uvvp5.mongodb.net`);
    app.listen(PORT, () => {
        Logger.info('Server is running http://localhost:'+PORT);
    });
})
.catch( (err) => {
    Logger.error(`Error connecting to the database. \n${err}`);
})