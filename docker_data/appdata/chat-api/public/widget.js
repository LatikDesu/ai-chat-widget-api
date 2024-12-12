;(function () {
	const ChatWidget = {
		async init(config) {
			if (!config.apiKey) {
				console.error('API key is required for Chat Widget')
				return
			}

			// Добавляем стили на страницу
			const styles = `
                .ai-chat-widget-button {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    width: 64px;
                    height: 64px;
                    border-radius: 9999px;
                    border: none;
                    cursor: pointer;
                    transition: transform 0.2s;
                    z-index: 999999;
                    padding: 0;
                    overflow: hidden;
                    background: transparent;
                }
                .ai-chat-widget-button img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    filter: drop-shadow(0 0 0 transparent);
                }
                .ai-chat-widget-button:hover {
                    transform: scale(1.05);
                }
                .ai-chat-widget-iframe {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    width: 430px;
                    height: 630px;
                    border-radius: 16px;
                    border: none;
                    z-index: 999999;
                    opacity: 0;
                    transform: scale(0);
                    transform-origin: calc(100% - 32px) calc(100% - 32px);
                    transition: all 0.3s ease-out;
                    pointer-events: none;
                    background: white;
                }
                .ai-chat-widget-iframe.active {
                    opacity: 1;
                    transform: scale(1);
                    pointer-events: all;
                }
            `

			const styleSheet = document.createElement('style')
			styleSheet.textContent = styles
			document.head.appendChild(styleSheet)

			try {
				// Получаем настройки виджета
				const response = await fetch(
					`https://chat-api.esoraine.online/api/v1/widget/key/${config.apiKey}`
				)
				const data = await response.json()
				const widgetConfig = data.customization

				// Создаем кнопку с иконкой из конфига
				const button = document.createElement('button')
				button.className = 'ai-chat-widget-button'

				const img = document.createElement('img')
				img.src =
					widgetConfig?.icon ||
					'https://chat-api.esoraine.online/widget-button.png'
				img.alt = 'Открыть чат'
				button.appendChild(img)

				// Создаем iframe
				const iframe = document.createElement('iframe')
				iframe.className = 'ai-chat-widget-iframe'
				iframe.src = `https://chat-api.esoraine.online/widget?apiKey=${config.apiKey}`

				// Добавляем элементы на страницу
				document.body.appendChild(button)
				document.body.appendChild(iframe)

				// Обработчик клика по кнопке
				button.addEventListener('click', () => {
					iframe.classList.toggle('active')
				})

				// Слушаем сообщения от iframe
				window.addEventListener('message', event => {
					if (event.data === 'closeWidget') {
						iframe.classList.remove('active')
					}
				})
			} catch (error) {
				console.error('Failed to initialize chat widget:', error)
			}
		},
	}

	// Делаем ChatWidget доступным глобально
	if (typeof window !== 'undefined') {
		window.ChatWidget = ChatWidget
		if (typeof window.onChatWidgetReady === 'function') {
			window.onChatWidgetReady()
		}
	}
})()
