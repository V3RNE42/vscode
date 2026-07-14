/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { constObservable } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { SessionSupportsSideChatContext } from '../../../../common/contextkeys.js';
import { setSessionContextKeys } from '../../common/sessionContextKeys.js';
import { ChatInteractivity, IChat, ISession } from '../../common/session.js';

const stubChat: IChat = {
	resource: URI.parse('test:///chat'),
	createdAt: new Date(),
	title: constObservable('Chat'),
	updatedAt: constObservable(new Date()),
	status: constObservable(0),
	changes: constObservable([]),
	checkpoints: constObservable(undefined),
	modelId: constObservable(undefined),
	mode: constObservable(undefined),
	isArchived: constObservable(false),
	isRead: constObservable(true),
	interactivity: constObservable(ChatInteractivity.Full),
	description: constObservable(undefined),
	lastTurnEnd: constObservable(undefined),
};

function stubSession(overrides: Partial<ISession> & Pick<ISession, 'sessionId'>): ISession {
	return {
		providerId: 'test',
		resource: URI.parse(`test:///${overrides.sessionId}`),
		sessionType: 'test',
		icon: Codicon.vm,
		createdAt: new Date(),
		workspace: constObservable(undefined),
		title: constObservable('Test'),
		updatedAt: constObservable(new Date()),
		status: constObservable(0),
		changesets: constObservable([]),
		changes: constObservable([]),
		modelId: constObservable(undefined),
		mode: constObservable(undefined),
		loading: constObservable(false),
		isArchived: constObservable(false),
		isRead: constObservable(true),
		description: constObservable(undefined),
		lastTurnEnd: constObservable(undefined),
		chats: constObservable([stubChat]),
		mainChat: constObservable(stubChat),
		capabilities: constObservable({ supportsMultipleChats: false }),
		...overrides,
	};
}

suite('setSessionContextKeys - side chat', () => {

	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	test('supportsSideChat reflects the session capability', () => {
		const contextKeyService = disposables.add(new MockContextKeyService());
		const session = stubSession({ sessionId: 'a', capabilities: constObservable({ supportsMultipleChats: true, supportsSideChat: true }) });

		setSessionContextKeys(session, contextKeyService, undefined);

		assert.strictEqual(SessionSupportsSideChatContext.getValue(contextKeyService), true);
	});

	test('supportsSideChat defaults to false when the capability is omitted', () => {
		const contextKeyService = disposables.add(new MockContextKeyService());
		const session = stubSession({ sessionId: 'a', capabilities: constObservable({ supportsMultipleChats: true }) });

		setSessionContextKeys(session, contextKeyService, undefined);

		assert.strictEqual(SessionSupportsSideChatContext.getValue(contextKeyService), false);
	});

	test('supportsSideChat resets to false for an undefined session', () => {
		const contextKeyService = disposables.add(new MockContextKeyService());
		const session = stubSession({ sessionId: 'a', capabilities: constObservable({ supportsMultipleChats: true, supportsSideChat: true }) });

		setSessionContextKeys(session, contextKeyService, undefined);
		assert.strictEqual(SessionSupportsSideChatContext.getValue(contextKeyService), true);

		setSessionContextKeys(undefined, contextKeyService, undefined);
		assert.strictEqual(SessionSupportsSideChatContext.getValue(contextKeyService), false);
	});

});
