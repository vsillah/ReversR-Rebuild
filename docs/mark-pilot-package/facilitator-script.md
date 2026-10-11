# Five-minute facilitator script

Use the [production tour entry](https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input).
Open the reconstruction menu, select **Tour**, and keep the clock visible. Treat
the tour checkboxes as prompts, not as proof that a manufacturing check passed.

## 0:00-0:30 | Set the boundary

Say:

> Mark, we are using one public Dispenser file that ReversR already has
> permission to use for review. I will not ask you for a file today. I want to
> know whether the evidence chain helps you decide what you can inspect and what
> still needs engineering follow-up. You already make that distinction in 2D
> print work: source artwork, a proof, and a production release are related, but
> they are not the same thing. We are testing whether ReversR makes the same
> boundary clear for CAD.

Confirm the first tour card says `Dispenser.IGS`, `IGES`, and public fixture.

## 0:30-1:10 | Source identity

Show the Input phase. Point to the original filename and format.

Say:

> The original IGS stays separate from the viewer. Its full SHA-256 fingerprint
> is `1e52b301cf33bc241cd0d3d039691236ab45116f439197820f690b424750f0b8`.
> That identifies these exact bytes. It does not tell us whether the drawing is
> the latest revision or whether the design intent is complete.

Ask:

> Before you trusted this source for quoting, what identity or revision evidence
> would you need beside the file? Think about the revision or approved-artwork
> evidence you expect before a 2D print job enters production.

Capture the missing evidence in Mark's words.

## 1:10-1:50 | Geometry facts

Advance to Inventory. Show millimeters, imported extents of
`55.74 × 69.42 × 114.83 mm`, and four connected components.

Say:

> These are importer observations. Four connected geometry components are not a
> certified part count, and the extents are not an inspected drawing. They are
> closer to reading a file's page size than approving trim, bleed, stock, and
> finishing instructions.

Ask:

> Which of these facts would help your intake, and which could be dangerous if a
> buyer mistook it for a verified dimension?

## 1:50-2:50 | Visual inspection

Advance to Design. Orbit the model, switch the shared control to Move, use one
fixed view, zoom, and fit. Compare one reference image with the model.

Say:

> The viewer is an inspection aid. The reference images help us ask better
> questions, but they do not change the geometry or raise its confidence.

Ask:

> Show me the first feature you would question before putting this into a 2D
> printing or fabrication workflow.

Record the feature, the action Mark took, and the evidence he wanted next.

## 2:50-3:40 | Source-to-STL lineage

Open the single Download menu. Point out `Original IGS (.igs)` and
`Inspection mesh (.stl)` as separate choices. Open the geometry and review
limits panel and show both fingerprints.

Say:

> The STL is a derived inspection mesh tied to the source fingerprint. Its
> fingerprint is `9b5bfa4b86d6976ae87e6f023b3a243d4b04966b2337b224203bb630e7b8096e`.
> The mesh has 2,634 triangles, four connected components, and it is not fully
> watertight. It may help visual review. This evidence does not make it a
> print-ready or fabrication-ready STL. If the IGS is the working source, the
> STL is closer to a proof than a new authoritative original.

Ask:

> What would you need to know about the conversion before this artifact could
> enter your workflow?

## 3:40-4:20 | Privacy and ownership

Advance to the privacy step.

Say:

> This tour reads public files already checked into ReversR. It does not ask for
> your CAD, activate the private upload path, or contact a conversion provider.
> Closing the guide saves only tour progress on this device. No Mark-owned file
> is part of today's session, and no file rights change hands.

Ask:

> If we later considered one file you control, what retention, deletion, and
> provider rules would need to be written down before you shared it?

## 4:20-5:00 | Make the hold decision

Advance to Build. Show that it remains locked.

Say:

> Rendering and conversion do not certify tolerances, materials, threads,
> finish, wall thickness, supports, orientation, or fabrication readiness. The
> correct decision today is hold for engineering and manufacturing review. A
> visible proof is useful, but it is not the same as production approval in a
> 2D print shop. The same discipline applies here.

Ask:

> If we fixed one thing before a second session, which change would give you the
> most useful evidence?

Finish only after the hold is clear. Do not request a file, quote, order, or
manufacturing approval.
