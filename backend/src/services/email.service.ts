import nodemailer, { Transporter } from 'nodemailer';

type SendMailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        path: string;
        contentType?: string;
    }>;
};

const getSmtpPort = (): number => {
    const parsed = Number(process.env.SMTP_PORT || 587);
    if (Number.isNaN(parsed) || parsed <= 0) return 587;
    return parsed;
};

const isSmtpConfigured = (): boolean => {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

// Module-level singleton transporter – created once on first use
let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
    if (transporter) return transporter;

    const port = getSmtpPort();
    const secure = port === 465;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporter;
};

export const sendMail = async (input: SendMailInput): Promise<void> => {
    if (!isSmtpConfigured()) {
        throw new Error('SMTP is not configured');
    }

    const transport = getTransporter();

    await transport.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
        attachments: input.attachments
    });
};
