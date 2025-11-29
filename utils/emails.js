const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

module.exports = class Email {
  constructor(user, url, token = null) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.token = token;
    this.from = process.env.EMAIL_FROM;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // SendGrid for production
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME, // 'apikey'
          pass: process.env.SENDGRID_PASSWORD, // actual API key
        },
      });
    }

    // Mailtrap for development
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // 1) Render HTML based on Pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      token: this.token,
      subject,
    });

    // 2) Convert HTML to text
    const text = htmlToText(html);

    // 3) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text,
    };

    // 4) Send email
    try {
      await this.newTransport().sendMail(mailOptions);
      console.log(`✅ Email sent to ${this.to}`);
    } catch (err) {
      console.error('Error sending email:', err);
      throw new Error('There was an error sending the email.');
    }
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};
