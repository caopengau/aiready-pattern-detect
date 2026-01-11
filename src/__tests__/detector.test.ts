import { describe, it, expect } from 'vitest';
import { detectDuplicatePatterns } from '../detector';

describe('detectDuplicatePatterns', () => {
  it('should detect exact duplicate functions', () => {
    const files = [
      {
        file: 'file1.ts',
        content: `
function getUserData(id: string) {
  const user = await db.users.findOne({ id });
  return user;
}
        `,
      },
      {
        file: 'file2.ts',
        content: `
async function getUserData(id: string) {
  const user = await db.users.findOne({ id });
  return user;
}
        `,
      },
    ];

    const duplicates = detectDuplicatePatterns(files, {
      minSimilarity: 0.8,
      minLines: 3,
    });

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].similarity).toBeGreaterThan(0.8);
  });

  it('should detect similar but not identical functions', () => {
    const files = [
      {
        file: 'file1.ts',
        content: `
function getUserData(id: string) {
  const user = await database.users.findOne({ id: id });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}
        `,
      },
      {
        file: 'file2.ts',
        content: `
async function getUserData(userId: string) {
  const user = await database.users.findOne({ id: userId });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}
        `,
      },
    ];

    const duplicates = detectDuplicatePatterns(files, {
      minSimilarity: 0.7,
      minLines: 3,
    });

    expect(duplicates.length).toBeGreaterThan(0);
  });

  it('should categorize API handler patterns', () => {
    const files = [
      {
        file: 'file1.ts',
        content: `
app.get('/api/users/:id', async (request, response) => {
  const user = await db.users.findOne({ id: request.params.id });
  response.json(user);
});
        `,
      },
      {
        file: 'file2.ts',
        content: `
app.get('/api/posts/:id', async (req, res) => {
  const post = await db.posts.findOne({ id: req.params.id });
  res.json(post);
});
        `,
      },
    ];

    const duplicates = detectDuplicatePatterns(files, {
      minSimilarity: 0.7,
      minLines: 3,
    });

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].patternType).toBe('api-handler');
  });

  it('should categorize validator patterns', () => {
    const files = [
      {
        file: 'file1.ts',
        content: `
function validateEmail(email: string) {
  if (!email) {
    throw new Error('Email is required');
  }
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
  return true;
}
        `,
      },
      {
        file: 'file2.ts',
        content: `
function validateUsername(username: string) {
  if (!username) {
    throw new Error('Username is required');
  }
  if (username.length < 3) {
    throw new Error('Username too short');
  }
  return true;
}
        `,
      },
    ];

    const duplicates = detectDuplicatePatterns(files, {
      minSimilarity: 0.65,
      minLines: 3,
    });

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].patternType).toBe('validator');
  });

  it('should calculate token cost', () => {
    const files = [
      {
        file: 'file1.ts',
        content: `
function processData(data: any) {
  const validated = validateInput(data);
  const result = validated.map((item: any) => item.value);
  const filtered = result.filter((x: any) => x !== null);
  return filtered;
}
        `,
      },
      {
        file: 'file2.ts',
        content: `
function processData(items: any) {
  const validated = validateInput(items);
  const result = validated.map((element: any) => element.value);
  const filtered = result.filter((x: any) => x !== null);
  return filtered;
}
        `,
      },
    ];

    const duplicates = detectDuplicatePatterns(files, {
      minSimilarity: 0.7,
      minLines: 3,
    });

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].tokenCost).toBeGreaterThan(0);
  });

  it('should not detect patterns below similarity threshold', () => {
    const files = [
      {
        file: 'file1.ts',
        content: `
function complexFunction(param: string) {
  const result = someComplexLogic(param);
  const transformed = anotherTransform(result);
  return transformed;
}
        `,
      },
      {
        file: 'file2.ts',
        content: `
function totallyDifferent() {
  return 42;
}
        `,
      },
    ];

    const duplicates = detectDuplicatePatterns(files, {
      minSimilarity: 0.9,
      minLines: 3,
    });

    expect(duplicates.length).toBe(0);
  });

  it('should not compare blocks from the same file', () => {
    const files = [
      {
        file: 'file1.ts',
        content: `
function func1() {
  return 1;
}

function func2() {
  return 2;
}
        `,
      },
    ];

    const duplicates = detectDuplicatePatterns(files, {
      minSimilarity: 0.5,
      minLines: 2,
    });

    expect(duplicates.length).toBe(0);
  });

  it('should sort duplicates by similarity and token cost', () => {
    const files = [
      {
        file: 'file1.ts',
        content: `
function a() {
  const x = 1;
  return x;
}
        `,
      },
      {
        file: 'file2.ts',
        content: `
function b() {
  const x = 1;
  return x;
}
        `,
      },
      {
        file: 'file3.ts',
        content: `
function c() {
  const y = 2;
  return y;
}
        `,
      },
    ];

    const duplicates = detectDuplicatePatterns(files, {
      minSimilarity: 0.7,
      minLines: 2,
    });

    if (duplicates.length > 1) {
      expect(duplicates[0].similarity).toBeGreaterThanOrEqual(
        duplicates[1].similarity
      );
    }
  });
});
