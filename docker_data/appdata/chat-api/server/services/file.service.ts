import { unlink, writeFile } from 'fs/promises'
import { join } from 'path'

export class FileService {
	private static readonly UPLOAD_DIR = 'public/uploads/icons'

	static async saveIcon(
		apiKeyId: string,
		file: Buffer,
		mimeType: string
	): Promise<string> {
		const extension = mimeType.split('/')[1] // например, 'png' из 'image/png'
		const fileName = `${apiKeyId}.${extension}`
		const filePath = join(process.cwd(), this.UPLOAD_DIR, fileName)

		// Удаляем старую иконку если она существует
		try {
			await unlink(filePath)
		} catch (error) {
			// Игнорируем ошибку если файл не существует
		}

		// Сохраняем новую иконку
		await writeFile(filePath, file)

		return fileName
	}

	static async deleteIcon(fileName: string): Promise<void> {
		if (!fileName) return

		const filePath = join(process.cwd(), this.UPLOAD_DIR, fileName)
		try {
			await unlink(filePath)
		} catch (error) {
			// Игнорируем ошибку если файл не существует
		}
	}
}
