interface RegistrationEmailData {
	activationUrl: string
	name?: string
	email?: string
	password?: string
}

export function getRegistrationEmailTemplate(data: RegistrationEmailData) {
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
						background-color: #007bff;
						color: #ffffff;
						text-decoration: none;
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
					.credentials {
						background-color: #f8f9fa;
						padding: 15px;
						border-radius: 4px;
						margin: 15px 0;
					}
					.thank-you-block {
						background-color: #f0f9ff;
						border-left: 4px solid #3b82f6;
						padding: 15px;
						margin: 15px 0;
						border-radius: 4px;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<img src="${process.env.APP_URL}/images/logo.png" alt="Logo">
					</div>
					
					<div class="content">
						<h2>Добро пожаловать${data.name ? `, ${data.name}` : ''}!</h2>
						
						<div class="thank-you-block">
							<p>Спасибо, что выбрали наш сервис! Мы очень рады видеть вас в числе наших пользователей и сделаем всё возможное, чтобы ваш опыт работы с нами был максимально комфортным и продуктивным.</p>
						</div>

						${
							data.password
								? `
							<div class="credentials">
								<h3>Ваши данные для входа:</h3>
								<p><strong>Email:</strong> ${data.email}</p>
								<p><strong>Пароль:</strong> ${data.password}</p>
								<p><small>Рекомендуем сменить пароль после первого входа в систему.</small></p>
							</div>
						`
								: ''
						}

						<p>Для активации вашего аккаунта, пожалуйста, нажмите на кнопку ниже:</p>
						
						<p style="text-align: center;">
							<a href="${data.activationUrl}" class="button">Активировать аккаунт</a>
						</p>
						
						<p><small>Или перейдите по ссылке: <a href="${data.activationUrl}">${
		data.activationUrl
	}</a></small></p>
						<p><small>Ссылка действительна в течение 24 часов.</small></p>

						<p>Если у вас возникнут вопросы, наша служба поддержки всегда готова помочь.</p>
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
