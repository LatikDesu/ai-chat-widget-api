import jwt from 'jsonwebtoken'

interface TokenPayload {
	userId: string
	email: string
	role: string
}

export class JWTService {
	private static readonly ACCESS_SECRET =
		process.env.JWT_ACCESS_SECRET || 'access_secret'
	private static readonly REFRESH_SECRET =
		process.env.JWT_REFRESH_SECRET || 'refresh_secret'
	private static readonly ACCESS_EXPIRES_IN =
		process.env.JWT_ACCESS_TOKEN_EXPIRES || '15m' // 15 минут
	private static readonly REFRESH_EXPIRES_IN =
		process.env.JWT_REFRESH_TOKEN_EXPIRES || '7d' // 7 дней

	static generateAccessToken(payload: TokenPayload): string {
		return jwt.sign(payload, this.ACCESS_SECRET, {
			expiresIn: this.ACCESS_EXPIRES_IN,
		})
	}

	static generateRefreshToken(payload: TokenPayload): string {
		return jwt.sign(payload, this.REFRESH_SECRET, {
			expiresIn: this.REFRESH_EXPIRES_IN,
		})
	}

	static verifyAccessToken(token: string): TokenPayload {
		return jwt.verify(token, this.ACCESS_SECRET) as TokenPayload
	}

	static verifyRefreshToken(token: string): TokenPayload {
		return jwt.verify(token, this.REFRESH_SECRET) as TokenPayload
	}

	static decodeToken(token: string): TokenPayload | null {
		try {
			return jwt.decode(token) as TokenPayload
		} catch {
			return null
		}
	}
}
