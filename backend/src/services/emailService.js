import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../logger/index.js';

let transporter;

function getTransporter () {
  if (transporter) return transporter;
  if (!config.smtpHost) {
    throw new Error('SMTP_HOST no está configurado. No es posible enviar correos.');
  }

  const transportOptions = {
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure
  };

  if (config.smtpUser && config.smtpPassword) {
    transportOptions.auth = {
      user: config.smtpUser,
      pass: config.smtpPassword
    };
  }

  transporter = nodemailer.createTransport(transportOptions);
  return transporter;
}

export async function sendPasswordResetEmail ({ to, username, resetLink, expiresAt }) {
  const transport = getTransporter();
  const formattedExpiration = expiresAt.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const mailOptions = {
    from: config.emailFrom,
    to,
    subject: 'Restablecimiento de contraseña - Panel Postgrados',
    text: `Hola,\n\nHemos recibido una solicitud para restablecer la contraseña de la cuenta ${username}. Puedes hacerlo ingresando al siguiente enlace:\n${resetLink}\n\nEste enlace expira el ${formattedExpiration}. Si no solicitaste este cambio, ignora este mensaje.\n\nSaludos,\nEquipo de Postgrados`,
    html: `
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de la cuenta <strong>${username}</strong>.</p>
      <p>Puedes crear una nueva contraseña haciendo clic en el siguiente botón:</p>
      <p style="margin:24px 0;">
        <a href="${resetLink}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">
          Restablecer contraseña
        </a>
      </p>
      <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p><small>El enlace expira el ${formattedExpiration}. Si no solicitaste este cambio, puedes ignorar este mensaje.</small></p>
      <p>Saludos,<br/>Equipo de Postgrados</p>
    `
  };

  await transport.sendMail(mailOptions);
  logger.info('Correo de restablecimiento enviado', { to });
}
