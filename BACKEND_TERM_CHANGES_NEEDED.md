# Backend Changes Needed for Term Integration

## Current Backend State

- Term model only has: `id`, `name` (unique), `status`, `createdAt`, `updatedAt`
- Terms are not linked to academic years
- Terms don't have start/end dates
- Term name must be globally unique (e.g., only one "Term 1" in entire system)

## Required Backend Changes

### 1. Update Prisma Schema (`prisma/schema.prisma`)

```prisma
model Term {
  id            String          @id @default(uuid())
  name          String          // "Term 1", "Term 2" (not unique anymore)
  academicYearId String
  startDate     DateTime        @db.Date
  endDate       DateTime?       @db.Date
  status        TermStatus      @default(OPEN)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  // Relations
  academicYear  AcademicYear    @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  subExams      SubExam[]
  marks         Mark[]

  @@unique([name, academicYearId]) // Term name unique per academic year
  @@index([academicYearId])
  @@index([status])
}

// Add relation to AcademicYear model
model AcademicYear {
  // ... existing fields ...
  terms         Term[]          // Add this relation
}
```

### 2. Update Term Service (`src/services/term.service.ts`)

```typescript
export const createTerm = async (data: {
  name: string;
  academicYearId: string;
  startDate: Date;
  endDate?: Date;
}) => {
  // Check if term already exists for this academic year
  const existing = await prisma.term.findUnique({
    where: {
      name_academicYearId: {
        name: data.name,
        academicYearId: data.academicYearId,
      },
    },
  });

  if (existing) {
    throw new ConflictError(
      `Term "${data.name}" already exists for this academic year`
    );
  }

  // Validate dates
  if (data.endDate && data.endDate <= data.startDate) {
    throw new BadRequestError("End date must be after start date");
  }

  const term = await prisma.term.create({
    data: {
      name: data.name,
      academicYearId: data.academicYearId,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });

  return term;
};

export const getTerms = async (academicYearId?: string) => {
  const where = academicYearId ? { academicYearId } : {};

  const terms = await prisma.term.findMany({
    where,
    include: {
      academicYear: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ academicYear: { startDate: "desc" } }, { startDate: "asc" }],
  });

  return terms;
};
```

### 3. Update Term Controller (`src/controllers/term.controller.ts`)

```typescript
export const createTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, academicYearId, startDate, endDate } = req.body;
    const term = await termService.createTerm({
      name,
      academicYearId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
    });
    sendSuccess(res, term, "Term created successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const getTerms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { academicYearId } = req.query;
    const terms = await termService.getTerms(
      academicYearId as string | undefined
    );
    sendSuccess(res, terms);
  } catch (error) {
    next(error);
  }
};
```

### 4. Update Term Routes (`src/routes/terms.ts`)

```typescript
const createTermSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    academicYearId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
  }),
});
```

### 5. Add Activate Term Endpoint

```typescript
// In term.service.ts
export const activateTerm = async (id: string) => {
  const term = await prisma.term.findUnique({
    where: { id },
    include: { academicYear: true },
  });

  if (!term) {
    throw new NotFoundError("Term not found");
  }

  // Check if academic year is active
  if (term.academicYear.status !== "ACTIVE") {
    throw new BadRequestError(
      "Cannot activate term for inactive academic year"
    );
  }

  // Optionally: Close other terms in the same academic year
  // Or allow multiple active terms (your choice)

  const updated = await prisma.term.update({
    where: { id },
    data: {
      status: "OPEN" as const,
    },
  });

  return updated;
};
```

## Migration Steps

1. Create a migration to add new fields:

   ```bash
   npx prisma migrate dev --name add_term_academic_year_dates
   ```

2. Update existing terms (if any) to assign them to academic years

3. Update seed data if needed

## Notes

- Term names are now unique per academic year (e.g., "Term 1" can exist for 2024-2025 and 2025-2026)
- Terms can have start/end dates within the academic year
- Multiple terms can be active at once (or you can add logic to close others when activating one)
