/**
 * Real builds, in real locations, for the homepage.
 *
 * Deliberately a hand-written list rather than a folder scan: each photo wants
 * a caption naming what it is and where it was, and the page says these are
 * vehicles we designed and put on the road — so nothing lands here that is not
 * one of ours. With the list empty the section shows an honest placeholder
 * instead of stock imagery.
 *
 * Drop files in `public/gallery/` and add a row.
 */
export interface GalleryShot {
	/** Path under public/, e.g. "/gallery/toyota-fab-lab.jpg". */
	src: string;
	/** What it is. */
	title: string;
	/** Where it was. */
	place: string;
	alt: string;
}

export const GALLERY: GalleryShot[] = [];

export const hasGallery = GALLERY.length > 0;
