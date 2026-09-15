# Factory reference photos

Real photographs of trailers Food Truck Factory has built. Every generated
concept is anchored to one of these, so the nine views agree with each other
and the render is something the factory can actually build.

## Where files go

```
public/references/<vehicleId>/   airstream-s, airstream-m, airstream-l,
                                 square-3m, square-4m, square-5m
public/references/<body>/        airstream, square  — fallback for any size
```

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
