import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: 'Reset your EmailFlow password',
    text: `You requested a password reset. Click the link below to set a new password (expires in 1 hour):\n\n${resetLink}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  })
}

export async function sendNewDeviceLoginEmail(input: {
  to: string
  loginTime: Date
  browser: string
  os: string
  ipAddress: string
  deviceName: string
}) {
  const loginTimeText = input.loginTime.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: input.to,
    subject: 'New device sign-in to your EmailFlow account',
    text: [
      'We noticed a sign-in from a new device.',
      '',
      `Time: ${loginTimeText}`,
      `Device: ${input.deviceName}`,
      `Browser: ${input.browser}`,
      `OS: ${input.os}`,
      `IP Address: ${input.ipAddress || 'Unavailable'}`,
      '',
      "If this was you, no action is needed. If this wasn't you, please reset your password and review active sessions immediately.",
    ].join('\n'),
    html: `
      <p>We noticed a sign-in from a new device.</p>
      <p><strong>Time:</strong> ${loginTimeText}</p>
      <p><strong>Device:</strong> ${input.deviceName}</p>
      <p><strong>Browser:</strong> ${input.browser}</p>
      <p><strong>OS:</strong> ${input.os}</p>
      <p><strong>IP Address:</strong> ${input.ipAddress || 'Unavailable'}</p>
      <p>If this was you, no action is needed. If this wasn't you, please reset your password and review active sessions immediately.</p>
    `,
  })
}
