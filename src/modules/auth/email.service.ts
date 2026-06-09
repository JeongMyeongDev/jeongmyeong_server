import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
      throw new InternalServerErrorException(
        'SMTP 설정이 필요합니다. 서버 .env에 SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS를 설정해 주세요.',
      );
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendVerificationEmail(email: string, verificationUrl: string) {
    const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;

    await this.getTransporter().sendMail({
      from,
      to: email,
      subject: '정명 이메일 인증',
      text: `아래 링크를 눌러 이메일 인증을 완료해 주세요.\n\n${verificationUrl}\n\n이 링크는 30분 동안 유효합니다.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>정명 이메일 인증</h2>
          <p>아래 버튼을 눌러 이메일 인증을 완료해 주세요.</p>
          <p>
            <a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;background:#4dc891;color:#fff;text-decoration:none;border-radius:999px;">
              이메일 인증하기
            </a>
          </p>
          <p>버튼이 열리지 않으면 아래 링크를 복사해서 브라우저에 붙여 넣어 주세요.</p>
          <p>${verificationUrl}</p>
          <p>이 링크는 30분 동안 유효합니다.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string) {
    const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;

    await this.getTransporter().sendMail({
      from,
      to: email,
      subject: '정명 비밀번호 재설정',
      text: `아래 링크를 눌러 비밀번호를 재설정해 주세요.\n\n${resetUrl}\n\n이 링크는 30분 동안 유효합니다.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>정명 비밀번호 재설정</h2>
          <p>아래 버튼을 눌러 비밀번호를 재설정해 주세요.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#4dc891;color:#fff;text-decoration:none;border-radius:999px;">
              비밀번호 재설정
            </a>
          </p>
          <p>버튼이 열리지 않으면 아래 링크를 복사해 브라우저에 붙여 넣어 주세요.</p>
          <p>${resetUrl}</p>
          <p>이 링크는 30분 동안 유효합니다.</p>
        </div>
      `,
    });
  }
}
