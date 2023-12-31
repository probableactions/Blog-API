const requireAuthorization = async (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({ err: 'Authorization Required' });
	}
	const { userId } = req.params;
	const activeUserId = req.user.id;

	if (!(userId === activeUserId)) {
		return res.status(403).json({
			status: 'error',
			code: 403,
			messages: ['Not authorized'],
			errors: [
				{
					status: '406',
					detail: 'Users can not access the data of another user.',
				},
			],
			data: null,
		});
	}
	next();
};

module.exports = requireAuthorization;
