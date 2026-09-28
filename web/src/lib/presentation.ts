import type { PresentationKind } from './types';

export const presentationKinds: PresentationKind[] = ['invited', 'contributed', 'poster'];

export const presentationKindLabels: Record<PresentationKind, string> = {
	invited: 'Invited talk',
	contributed: 'Contributed talk',
	poster: 'Poster',
};

export function isPresentationKind(value: unknown): value is PresentationKind {
	return presentationKinds.includes(value as PresentationKind);
}
