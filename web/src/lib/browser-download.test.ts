import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './browser-download';

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('downloadBlob', () => {
	it('clicks an attached anchor before revoking its URL later', () => {
		vi.useFakeTimers();
		const events: string[] = [];
		const anchor = {
			href: '',
			download: '',
			hidden: false,
			click: () => events.push('click'),
			remove: () => events.push('remove'),
		};
		vi.stubGlobal('URL', {
			createObjectURL: () => 'blob:test',
			revokeObjectURL: () => events.push('revoke'),
		});
		vi.stubGlobal('document', {
			createElement: () => anchor,
			body: { appendChild: () => events.push('append') },
		});

		downloadBlob(new Blob(['resume']), 'resume.pdf');
		expect(events).toEqual(['append', 'click', 'remove']);
		expect(anchor.href).toBe('blob:test');
		expect(anchor.download).toBe('resume.pdf');
		vi.runAllTimers();
		expect(events).toEqual(['append', 'click', 'remove', 'revoke']);
	});

	it('releases the object URL and anchor if the browser rejects the download', () => {
		const events: string[] = [];
		vi.stubGlobal('URL', {
			createObjectURL: () => 'blob:test',
			revokeObjectURL: () => events.push('revoke'),
		});
		vi.stubGlobal('document', {
			createElement: () => ({
				click: () => {
					throw new Error('download blocked');
				},
				remove: () => events.push('remove'),
			}),
			body: { appendChild: () => events.push('append') },
		});
		expect(() => downloadBlob(new Blob(['resume']), 'backup.json')).toThrow('download blocked');
		expect(events).toEqual(['append', 'revoke', 'remove']);
	});
});
