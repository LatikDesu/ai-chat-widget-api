interface ResetPasswordEmailData {
	resetUrl: string
	name?: string
	email?: string
}

export function getResetPasswordEmailTemplate(data: ResetPasswordEmailData) {
	return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            padding: 20px;
            background-color: #1a1a1a;
          }
          .header img {
            max-width: 200px;
          }
          .content {
            padding: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #dc3545;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .warning {
            color: #856404;
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            padding: 12px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            color: #6c757d;
            font-size: 14px;
          }
          .social-links {
            margin: 10px 0;
          }
          .social-links a {
            color: #007bff;
            text-decoration: none;
            margin: 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${process.env.APP_URL}/images/logo.png" alt="Logo">
          </div>
          
          <div class="content">
            <h2>Сброс пароля${data.name ? ` для ${data.name}` : ''}</h2>
            <p>Мы получили запрос на сброс пароля для аккаунта${
							data.email ? ` (${data.email})` : ''
						}.</p>
            <p>Для установки нового пароля нажмите на кнопку ниже:</p>
            <p style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Сбросить пароль</a>
            </p>
            <p><small>Или перейдите по ссылке: <a href="${data.resetUrl}">${
		data.resetUrl
	}</a></small></p>
            
            <div class="warning">
              <strong>Важно!</strong>
              <ul>
                <li>Ссылка действительна в течение 1 часа</li>
                <li>Если вы не запрашивали сброс пароля, проигнорируйте это письмо</li>
                <li>Для безопасности используйте надежный пароль</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            <div class="social-links">
              <a href="https://t.me/your_channel">Telegram</a>
              <a href="https://github.com/your_org">GitHub</a>
              <a href="${process.env.APP_URL}">Веб-сайт</a>
            </div>
            <p>© ${new Date().getFullYear()} Your Company. Все права защищены.</p>
          </div>
        </div>
      </body>
    </html>
  `
}
