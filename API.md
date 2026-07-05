# ConceptMap API Contract

Base URL: http://localhost:4000

---

## Health

### GET /health
Check if server is running.

**Response**
```json
{ "status": "ok" }
```

---

## Courses

### GET /api/courses
List all courses.

**Response**
```json
{
  "courses": [
    {
      "id": "df5d1db2-...",
      "title": "Intro to Programming",
      "description": "Learn programming fundamentals",
      "educatorId": "educator1",
      "createdAt": "2026-07-03T13:02:03.659Z"
    }
  ]
}
```

### POST /api/courses
Create a new course.

**Body**
```json
{
  "title": "Intro to Programming",
  "description": "Learn programming fundamentals",
  "educatorId": "educator1"
}
```

**Response** `201`
```json
{
  "id": "df5d1db2-...",
  "title": "Intro to Programming",
  "description": "Learn programming fundamentals",
  "educatorId": "educator1",
  "createdAt": "2026-07-03T13:02:03.659Z"
}
```

### GET /api/courses/:id
Get a single course with all its concepts and edges.

**Response**
```json
{
  "course": { "id": "...", "title": "Intro to Programming" },
  "concepts": [
    { "id": "1", "title": "Variables", "courseId": "demo", "x": 300, "y": 50 }
  ],
  "edges": [
    { "from": "1", "to": "2" }
  ]
}
```

### DELETE /api/courses/:id
Delete a course and all its concepts.

**Response**
```json
{ "deleted": "df5d1db2-..." }
```

---

## Concepts

### GET /api/concepts?courseId=demo
Get all concepts and edges for a course.

**Query params**
- `courseId` (required)

**Response**
```json
{
  "concepts": [
    { "id": "1", "title": "Variables", "courseId": "demo", "x": 300, "y": 50 }
  ],
  "edges": [
    { "from": "1", "to": "2" }
  ]
}
```

### POST /api/concepts
Create a new concept.

**Body**
```json
{
  "title": "Variables",
  "description": "Storing and naming data values.",
  "courseId": "demo",
  "x": 300,
  "y": 50
}
```

**Required fields:** `title`, `courseId`, `x`, `y`

**Response** `201`
```json
{
  "id": "f8057c22-...",
  "title": "Variables",
  "description": "Storing and naming data values.",
  "courseId": "demo",
  "x": 300,
  "y": 50
}
```

### DELETE /api/concepts/:id
Delete a concept and all its relationships.

**Response**
```json
{ "deleted": "1" }
```

### POST /api/concepts/edge
Create a dependency between two concepts.
(fromId is the prerequisite, toId depends on it)

**Body**
```json
{
  "fromId": "1",
  "toId": "2",
  "courseId": "demo"
}
```

**Required fields:** `fromId`, `toId`, `courseId`

**Response** `201`
```json
{ "from": "1", "to": "2" }
```

---

## Mastery

### PATCH /api/mastery/:conceptId
Update a student's mastery status for a concept.

**Body**
```json
{
  "studentId": "student1",
  "status": "struggling"
}
```

**Valid status values:** `learning` | `confident` | `struggling`

**Response**
```json
{
  "studentId": "student1",
  "conceptId": "6",
  "status": "struggling"
}
```

### GET /api/mastery/:studentId
Get all mastery statuses for a student.

**Response**
```json
{
  "studentId": "student1",
  "mastery": [
    { "conceptId": "6", "status": "struggling" },
    { "conceptId": "7", "status": "confident" }
  ]
}
```

---

## Gaps

### GET /api/gaps/:conceptId?studentId=student1
Get all downstream concepts at risk if this concept is a gap.
Optionally pass studentId to get mastery-aware risk levels.

**Query params**
- `studentId` (optional)

**Response**
```json
{
  "gapConceptId": "6",
  "studentId": "student1",
  "atRisk": [
    { "id": "9", "title": "Recursion",       "distance": 1, "status": "struggling", "risk": "high"    },
    { "id": "8", "title": "Objects",          "distance": 1, "status": "unknown",   "risk": "unknown" },
    { "id": "10","title": "Higher-Order Fns", "distance": 2, "status": "unknown",   "risk": "unknown" },
    { "id": "7", "title": "Arrays",           "distance": 1, "status": "confident", "risk": "safe"    }
  ]
}
```

**Risk levels**
| Status | Risk |
|--------|------|
| struggling | high |
| learning | medium |
| unknown | unknown |
| confident | safe |

---

## Error responses

All routes return errors in this shape:

```json
{ "error": "Description of what went wrong" }
```

| Code | Meaning |
|------|---------|
| 400 | Bad request — missing or invalid fields |
| 404 | Resource not found |
| 500 | Server or database error |

---

## Quick start for Person A (Frontend)

1. Make sure this backend is running: `npm run dev`
2. Set in your frontend `.env`: `VITE_API_URL=http://localhost:4000`
3. Use `courseId=demo` for development — seed data is already loaded
4. Default studentId for testing: `student1`