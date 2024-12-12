import crypto from 'crypto'

export class PasswordService {
	private static readonly ITERATIONS = 10000
	private static readonly KEY_LENGTH = 64
	private static readonly DIGEST = 'sha512'
	private static readonly SALT_LENGTH = 16

	static async hash(password: string): Promise<string> {
		const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex')
		const hash = crypto
			.pbkdf2Sync(password, salt, this.ITERATIONS, this.KEY_LENGTH, this.DIGEST)
			.toString('hex')
		return `${salt}:${hash}`
	}

	static async verify(password: string, storedHash: string): Promise<boolean> {
		try {
			const [salt, hash] = storedHash.split(':')
			const verifyHash = crypto
				.pbkdf2Sync(
					password,
					salt,
					this.ITERATIONS,
					this.KEY_LENGTH,
					this.DIGEST
				)
				.toString('hex')
			return hash === verifyHash
		} catch (error) {
			return false
		}
	}

	static generatePassword(length: number = 12): string {
		const charset =
			'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
		let password = ''
		for (let i = 0; i < length; i++) {
			password += charset[Math.floor(Math.random() * charset.length)]
		}
		return password
	}
}
