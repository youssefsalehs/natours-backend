const nodemailer = require('nodemailer');
const sendEmail = async (options) => {
  //1) create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  //2) define the email options
  const mailOptions = {
    from: 'Youssef Saleh <youssefki@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  //3) actually send the email
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    throw err;
  }
};
module.exports = sendEmail;
