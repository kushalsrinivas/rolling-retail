# Factory reference photos

Real photographs of trailers Food Truck Factory has built. Every generated
concept is anchored to one of these, so the nine views agree with each other
and the render is something the factory can actually build.

## Where files go

```
references/<vehicleId>/   airstream-s, airstream-m, airstream-l,
                          square-3m, square-4m, square-5m
references/<body>/        airstream, square  — fallback for any size
```

This folder is deliberately **not** under `public/`. Static assets are served
before the password gate, so anything in `public/` on a private customer
preview is still fetchable by URL. These files are read from disk on the
server and sent straight to the image model; they are never served.

Set `REFERENCES_DIR` to keep them somewhere else — on a host where the app
filesystem is read-only or the bundle excludes them, point it at a mounted
volume.

The first image in the folder (alphabetical) is used. `.jpg`, `.jpeg`, `.png`
and `.webp` are read; anything over 4MB is skipped, so downscale before
committing — roughly 1600px on the long edge is plenty.

## What makes a good reference

- The trailer square-on or at a gentle three-quarter angle, filling the frame.
- Plain background. A truck shot in the yard with three other trucks behind it
  gives the model four trailers to choose from, and it will pick wrong.
- Even daylight, no heavy shadow across the body.
- Unwrapped or plainly wrapped is better than loud livery — the wrap is the
  part we want the model to replace.

Nothing here is required. With the folders empty the pipeline still runs; it
just loses the consistency lock, and the shell drifts between views.
