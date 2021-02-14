const {mwn, bot, expect, setup, teardown} = require('./local_wiki');

describe('write methods', async function () {

	before('setup', setup);
	after('teardown', teardown);

	let u = new bot.user('Wikiuser2');

	it('sends message', function () {
		return u.sendMessage('Hi', 'Testing from mwn. ~~~~').then(data => {
			expect(data).to.be.an('object').which.has.property('result').that.equals('Success');
		});
	});

	it('sends email', function () {
		return expect(u.email('Subject', 'body')).to.be.eventually.rejectedWith(mwn.Error)
			.with.property('code').that.equals('noemail');
	});

	it('block', function () {
		return u.block().then(data => {
			expect(data).to.be.an('object').that.includes.keys('user', 'userID', 'reason',
				'anononly', 'nocreate', 'partial');
			expect(data.user).to.equal('Wikiuser2');
		});
	});

	it('unblock', function () {
		return u.unblock().then(data => {
			expect(data).to.be.an('object').that.includes.keys('user', 'id', 'userid', 'reason');
			expect(data.user).to.equal('Wikiuser2');
		});
	});

});
