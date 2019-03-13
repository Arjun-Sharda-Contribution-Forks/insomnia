import VCS from '../';
import MemoryDriver from '../../store/drivers/memory-driver';

function newDoc(id) {
  return { id };
}

describe('VCS', () => {
  beforeEach(() => {
    let ts = 1000000000000;
    Date.now = jest.fn(() => ts++);
  });

  describe('status()', () => {
    it('returns status with no commits', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      const status = await v.status([
        {
          key: 'foo',
          name: 'Foo',
          document: newDoc('bar'),
        },
        {
          key: 'baz',
          name: 'Baz',
          document: newDoc('qux'),
        },
      ]);

      expect(status).toEqual({
        key: 'ae21cdccbf8c16d8d559b701c9604949b40d12ed',
        stage: {},
        unstaged: {
          foo: {
            added: true,
            key: 'foo',
            blobContent: '{"id":"bar"}',
            blobId: 'b933e3dbd1d218e2763de8e3ece6147527d046af',
            name: 'Foo',
          },
          baz: {
            added: true,
            key: 'baz',
            blobContent: '{"id":"qux"}',
            blobId: 'dc61fb5cb183286293dc7f0e8499b4e1e09eef05',
            name: 'Baz',
          },
        },
      });
    });

    it('returns add/modify/delete operations', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      const status1 = await v.status([
        { key: 'a', name: 'A', document: newDoc('aaa') },
        { key: 'b', name: 'B', document: newDoc('bbb') },
        { key: 'c', name: 'C', document: newDoc('ccc') },
      ]);
      expect(Object.keys(status1.unstaged)).toEqual(['a', 'b', 'c']);

      await v.stage([status1.unstaged['a'], status1.unstaged['b'], status1.unstaged['c']]);

      await v.takeSnapshot('Add a/b/c');
      const history = await v.getHistory();
      expect(history.length).toBe(1);
      expect(history).toEqual([
        {
          created: expect.any(Date),
          description: '',
          id: '6761e77e27c6158f84f00212e2dfa5fa9ef16dd9',
          name: 'Add a/b/c',
          parent: '0000000000000000000000000000000000000000',
          state: [
            {
              blob: '210be55f7998bb55805f9d65c5345103e7957929',
              key: 'a',
              name: 'A',
            },
            {
              blob: '8ce1aded8fa999d1c5632ff993b56dd9aa1f4880',
              key: 'b',
              name: 'B',
            },
            {
              blob: 'ce29c03e80866a215004d55f160a9a7b510ceacb',
              key: 'c',
              name: 'C',
            },
          ],
        },
      ]);

      // Should get every operation type
      const status = await v.status([
        { key: 'notA', name: 'Not A', document: newDoc('aaa') },
        { key: 'b', name: 'B', document: newDoc('bbb') },
        { key: 'c', name: 'C', document: newDoc('modified') },
        { key: 'd', name: 'D', document: newDoc('ddd') },
      ]);

      expect(status).toEqual({
        key: 'e0e8f9c6a206a14def57c29cd0dd4d2aaa52826e',
        stage: {},
        unstaged: {
          a: {
            deleted: true,
            key: 'a',
            name: 'A',
          },
          notA: {
            added: true,
            key: 'notA',
            name: 'Not A',
            blobId: '210be55f7998bb55805f9d65c5345103e7957929',
            blobContent: '{"id":"aaa"}',
          },
          c: {
            modified: true,
            key: 'c',
            name: 'C',
            blobId: 'c32090250612936632fa4a3127507aa0694ba375',
            blobContent: '{"id":"modified"}',
          },
          d: {
            added: true,
            key: 'd',
            name: 'D',
            blobId: 'd4d10ce251d7184fa14587796aed6e06c549f7a4',
            blobContent: '{"id":"ddd"}',
          },
        },
      });

      await v.stage([
        status.unstaged['a'],
        status.unstaged['notA'],
        status.unstaged['c'],
        status.unstaged['d'],
      ]);

      const status2 = await v.status([
        { key: 'notA', name: 'Not A', document: newDoc('aaa') },
        { key: 'b', name: 'B', document: newDoc('bbb') },
        { key: 'c', name: 'C', document: newDoc('modified') },
        { key: 'd', name: 'D', document: newDoc('ddd') },
      ]);

      expect(status2).toEqual({
        key: '4e1f4ec1cc18b24318c1a156de4b2d96a542ba62',
        stage: {
          a: {
            deleted: true,
            key: 'a',
            name: 'A',
          },
          notA: {
            added: true,
            blobId: '210be55f7998bb55805f9d65c5345103e7957929',
            key: 'notA',
            name: 'Not A',
            blobContent: '{"id":"aaa"}',
          },
          c: {
            modified: true,
            blobId: 'c32090250612936632fa4a3127507aa0694ba375',
            key: 'c',
            name: 'C',
            blobContent: '{"id":"modified"}',
          },
          d: {
            added: true,
            blobId: 'd4d10ce251d7184fa14587796aed6e06c549f7a4',
            key: 'd',
            name: 'D',
            blobContent: '{"id":"ddd"}',
          },
        },
        unstaged: {},
      });
    });

    it('can appear both staged and unstaged', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      const status = await v.status([
        { key: 'a', name: 'A', document: newDoc('aaa') },
        { key: 'b', name: 'B', document: newDoc('bbb') },
      ]);
      await v.stage([status.unstaged['a']]);

      const status2 = await v.status([
        { key: 'a', name: 'A', document: newDoc('modified') },
        { key: 'b', name: 'B', document: newDoc('bbb') },
      ]);

      expect(status2).toEqual({
        key: 'e2669f9aae595e31e1010b3f67abf721d9da56ed',
        stage: {
          a: {
            added: true,
            blobId: '210be55f7998bb55805f9d65c5345103e7957929',
            name: 'A',
            key: 'a',
            blobContent: '{"id":"aaa"}',
          },
        },
        unstaged: {
          a: {
            added: true,
            blobId: 'c32090250612936632fa4a3127507aa0694ba375',
            key: 'a',
            name: 'A',
            blobContent: '{"id":"modified"}',
          },
          b: {
            added: true,
            blobId: '8ce1aded8fa999d1c5632ff993b56dd9aa1f4880',
            name: 'B',
            key: 'b',
            blobContent: '{"id":"bbb"}',
          },
        },
      });
    });

    it('should not show committed entities', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      const status = await v.status([{ key: 'foo', name: 'Foo', document: newDoc('bar') }]);
      await v.stage([status.unstaged['foo']]);
      await v.takeSnapshot('Add foo');

      const status2 = await v.status([{ key: 'foo', name: 'Foo', document: newDoc('bar') }]);
      expect(status2).toEqual({
        key: 'a879eff7f977bb847932749776643a491bec00c7',
        stage: {},
        unstaged: {},
      });
    });
  });

  describe('stage()', () => {
    it('stages entity', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      const status = await v.status([
        { key: 'foo', name: 'Foo', document: newDoc('bar') },
        { key: 'baz', name: 'Baz', document: newDoc('qux') },
      ]);

      const stage = await v.stage([status.unstaged['foo']]);
      expect(stage).toEqual({
        foo: {
          key: 'foo',
          name: 'Foo',
          blobContent: '{"id":"bar"}',
          blobId: 'b933e3dbd1d218e2763de8e3ece6147527d046af',
          added: true,
        },
      });

      const status2 = await v.status([
        { key: 'foo', name: 'Foo', document: newDoc('bar') },
        { key: 'baz', name: 'Baz', document: newDoc('qux') },
      ]);
      expect(status2).toEqual({
        key: '3b2409ae62d0550e3bfbeea4d063dc2bbca6cae5',
        stage: {
          foo: {
            name: 'Foo',
            key: 'foo',
            blobContent: '{"id":"bar"}',
            blobId: 'b933e3dbd1d218e2763de8e3ece6147527d046af',
            added: true,
          },
        },
        unstaged: {
          baz: {
            key: 'baz',
            name: 'Baz',
            blobContent: '{"id":"qux"}',
            blobId: 'dc61fb5cb183286293dc7f0e8499b4e1e09eef05',
            added: true,
          },
        },
      });
    });
  });

  describe('takeSnapshot()', () => {
    it('commits basic entity', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      const status = await v.status([{ key: 'foo', name: 'Foo', document: newDoc('bar') }]);
      await v.stage([status.unstaged['foo']]);
      await v.takeSnapshot('Add foo');

      const history = await v.getHistory();
      expect(history).toEqual([
        {
          id: '37d0db42b703ffcf6331dc4fc2d9233575edac2a',
          created: expect.any(Date),
          name: 'Add foo',
          description: '',
          parent: '0000000000000000000000000000000000000000',
          state: [
            {
              blob: 'b933e3dbd1d218e2763de8e3ece6147527d046af',
              key: 'foo',
              name: 'Foo',
            },
          ],
        },
      ]);
    });

    it('commits deleted entity', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      const status = await v.status([{ key: 'foo', name: 'Foo', document: newDoc('bar') }]);
      await v.stage([status.unstaged['foo']]);
      await v.takeSnapshot('Add foo');

      const history = await v.getHistory();
      expect(history).toEqual([
        {
          id: '37d0db42b703ffcf6331dc4fc2d9233575edac2a',
          created: expect.any(Date),
          name: 'Add foo',
          description: '',
          parent: '0000000000000000000000000000000000000000',
          state: [
            {
              blob: 'b933e3dbd1d218e2763de8e3ece6147527d046af',
              key: 'foo',
              name: 'Foo',
            },
          ],
        },
      ]);

      const status2 = await v.status([]);
      await v.stage([status2.unstaged['foo']]);
      await v.takeSnapshot('Delete foo');
      const history2 = await v.getHistory();

      expect(history2).toEqual([
        {
          id: '37d0db42b703ffcf6331dc4fc2d9233575edac2a',
          created: expect.any(Date),
          name: 'Add foo',
          description: '',
          parent: '0000000000000000000000000000000000000000',
          state: [
            {
              blob: 'b933e3dbd1d218e2763de8e3ece6147527d046af',
              key: 'foo',
              name: 'Foo',
            },
          ],
        },
        {
          id: '00345d33c3319c869a544e8e34496bf73df07e08',
          created: expect.any(Date),
          name: 'Delete foo',
          description: '',
          parent: '37d0db42b703ffcf6331dc4fc2d9233575edac2a',
          state: [],
        },
      ]);
    });
  });

  describe('getBranches()', () => {
    it('lists branches', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      await v.checkout('branch-1');
      await v.checkout('branch-2');

      const branches = await v.getBranches();
      expect(branches).toEqual(['master', 'branch-1', 'branch-2']);
    });
  });

  describe('removeBranch()', () => {
    it('cannot remove empty branch', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      let didError = false;
      try {
        await v.removeBranch();
      } catch (err) {
        didError = true;
      }

      expect(didError).toBe(true);
    });

    it('cannot remove current branch', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      let didError = false;
      try {
        await v.removeBranch('master');
      } catch (err) {
        didError = true;
      }

      expect(didError).toBe(true);
    });

    it('remove branch', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      // Add something to master
      const status1 = await v.status([{ key: 'foo', name: 'Foo', document: newDoc('bar') }]);
      await v.stage([status1.unstaged['foo']]);
      await v.takeSnapshot('Add foo');

      // Checkout branch
      await v.checkout('new-branch');
      expect(await v.getBranches()).toEqual(['master', 'new-branch']);

      // Back to master and delete other branch
      await v.checkout('master');
      await v.removeBranch('new-branch');
      expect(await v.getBranches()).toEqual(['master']);
    });
  });

  describe('fork()', () => {
    it('forks to a new branch', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      // Add something to master
      const status1 = await v.status([{ key: 'foo', name: 'Foo', document: newDoc('bar') }]);
      await v.stage([status1.unstaged['foo']]);
      await v.takeSnapshot('Add foo');

      // Checkout branch
      await v.fork('new-branch');
      await v.checkout('new-branch');
      const history = await v.getHistory();
      expect(await v.getBranch()).toBe('new-branch');
      expect(history).toEqual([
        {
          created: expect.any(Date),
          id: '37d0db42b703ffcf6331dc4fc2d9233575edac2a',
          parent: '0000000000000000000000000000000000000000',
          name: 'Add foo',
          description: '',
          state: [
            {
              blob: 'b933e3dbd1d218e2763de8e3ece6147527d046af',
              key: 'foo',
              name: 'Foo',
            },
          ],
        },
      ]);
    });
  });

  const name = 'merge()';
  describe(name, () => {
    it('performs fast-forward merge', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');
      const status1 = await v.status([
        { key: 'a', name: 'A', document: newDoc('aaa') },
        { key: 'b', name: 'B', document: newDoc('bbb') },
      ]);
      await v.stage([status1.unstaged['a'], status1.unstaged['b']]);
      await v.takeSnapshot('Add A and B');
      expect((await v.getHistory())[0].state).toEqual([
        expect.objectContaining({ key: 'a' }),
        expect.objectContaining({ key: 'b' }),
      ]);

      await v.fork('feature-a');
      await v.checkout('feature-a');
      const status2 = await v.status([
        { key: 'a', name: 'A', document: newDoc('aaa') },
        { key: 'b', name: 'B', document: newDoc('bbbbbbb') },
        { key: 'c', name: 'C', document: newDoc('ccc') },
      ]);
      await v.stage([status2.unstaged['b'], status2.unstaged['c']]);
      await v.takeSnapshot('Add C, modify B');
      expect((await v.getHistory())[1].state).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'a' }),
          expect.objectContaining({ key: 'b' }),
          expect.objectContaining({ key: 'c' }),
        ]),
      );
    });

    it('merges even if no common root', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');
      const status1 = await v.status([
        { key: 'a', name: 'A', document: newDoc('aaa') },
        { key: 'b', name: 'B', document: newDoc('bbb') },
      ]);
      await v.stage([status1.unstaged['a'], status1.unstaged['b']]);
      await v.takeSnapshot();
    });

    it('does something', async () => {
      const v = new VCS('wrk_1', new MemoryDriver());
      await v.checkout('master');

      // Add a file to master
      expect(await v.getBranch()).toBe('master');
      const status1 = await v.status([{ key: 'a', name: 'A', document: newDoc('aaa') }]);
      await v.stage([status1.unstaged['a']]);
      await v.takeSnapshot('Add A');
      expect(await v.getHistory()).toEqual([
        {
          id: 'fd2b39c128ecbb478d3b485a3de75317c824a207',
          created: expect.any(Date),
          parent: '0000000000000000000000000000000000000000',
          name: 'Add A',
          description: '',
          state: [
            {
              blob: '210be55f7998bb55805f9d65c5345103e7957929',
              key: 'a',
              name: 'A',
            },
          ],
        },
      ]);

      // Checkout new branch and add file
      await v.fork('new-branch');
      await v.checkout('new-branch');
      expect(await v.getBranch()).toBe('new-branch');

      const status2 = await v.status([{ key: 'b', name: 'B', document: newDoc('bbb') }]);
      await v.stage([status2.unstaged['b']]);
      await v.takeSnapshot('Add B');
      expect(await v.getHistory()).toEqual([
        {
          id: 'fd2b39c128ecbb478d3b485a3de75317c824a207',
          created: expect.any(Date),
          parent: '0000000000000000000000000000000000000000',
          name: 'Add A',
          description: '',
          state: [
            {
              blob: '210be55f7998bb55805f9d65c5345103e7957929',
              key: 'a',
              name: 'A',
            },
          ],
        },
        {
          id: '73ca8b5e0f7e38b3ae07162d757282f232f9a75a',
          created: expect.any(Date),
          parent: 'fd2b39c128ecbb478d3b485a3de75317c824a207',
          name: 'Add B',
          description: '',
          state: [
            {
              blob: '210be55f7998bb55805f9d65c5345103e7957929',
              key: 'a',
              name: 'A',
            },
            {
              blob: '8ce1aded8fa999d1c5632ff993b56dd9aa1f4880',
              key: 'b',
              name: 'B',
            },
          ],
        },
      ]);

      // Merge new branch back into master
      await v.checkout('master');
      expect(await v.getBranch()).toBe('master');
      await v.merge('new-branch');
      expect(await v.getHistory()).toEqual([
        {
          id: 'fd2b39c128ecbb478d3b485a3de75317c824a207',
          created: expect.any(Date),
          parent: '0000000000000000000000000000000000000000',
          name: 'Add A',
          description: '',
          state: [
            {
              blob: '210be55f7998bb55805f9d65c5345103e7957929',
              key: 'a',
              name: 'A',
            },
          ],
        },
        {
          id: '73ca8b5e0f7e38b3ae07162d757282f232f9a75a',
          created: expect.any(Date),
          parent: 'fd2b39c128ecbb478d3b485a3de75317c824a207',
          name: 'Add B',
          description: '',
          state: [
            {
              blob: '210be55f7998bb55805f9d65c5345103e7957929',
              key: 'a',
              name: 'A',
            },
            {
              blob: '8ce1aded8fa999d1c5632ff993b56dd9aa1f4880',
              key: 'b',
              name: 'B',
            },
          ],
        },
      ]);
    });
  });
});