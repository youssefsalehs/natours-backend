const dotenv = require('dotenv');
dotenv.config(); //it must be after the requuire
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION💥, shutting down....');
  console.log(err.name, err.message);

  process.exit(1);
});

const app = require('./app');

const mongoose = require('mongoose');
const db = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(db, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('db connected successfuly');
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`app is running on port ${port} .....`);
});
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION💥, shutting down....');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
