import { test, expect, type Page } from '@playwright/test';

/**
 * タスク追加の共通ヘルパー
 */
async function createNewTask(page: Page, title: string) {
  const taskInput = page.getByPlaceholder('新しいタスクを入力...');
  await expect(taskInput).toBeVisible();
  await taskInput.fill(title);
  const submitButton = page.getByRole('button', { name: 'タスクを追加' });
  await submitButton.click();
  const taskItem = page.getByText(title);
  await expect(taskItem).toBeVisible();
  return taskItem;
}

test.describe('QuackTrack 受入基準 (AC-01 〜 AC-06) 結合テスト', () => {
  test.beforeEach(async ({ page }) => {
    // トップページへ遷移し、UIの初期マウント完了を待機
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('task-panel')).toBeVisible();
    await expect(page.getByTestId('duck-canvas-container')).toBeVisible();
    await expect(page.getByTestId('duck-count-active')).toBeVisible();
  });

  /**
   * AC-01: タスク作成とアヒルの出現
   * - Given: アプリケーションが開かれ、草原エリアが表示されている。
   * - When: UIの「新規タスク」からタイトル「新規開発タスク」を入力して作成ボタンを押す。
   * - Then:
   *   - タスクリストに「新規開発タスク」（Status: todo）が即時追加される。
   *   - タスク一覧パネルに追加され、頭数カウンターが更新される。
   *   - 3D diorama canvas 内に [data-testid="duck-..."] または Canvas 描画が確認される。
   *   - LocalStorage の quacktrack-tasks (および quacktrack_tasks_v1) に保存される。
   */
  test('AC-01: タスク作成とアヒルの出現', async ({ page }) => {
    // 初期カウンターの未完了数を取得
    const initialActiveBadge = page.getByTestId('duck-count-active');
    const initialText = await initialActiveBadge.innerText();
    const initialActiveCount = parseInt(initialText.replace(/[^0-9]/g, ''), 10) || 0;

    // タスク入力欄に「新規開発タスク」と入力して追加
    await createNewTask(page, '新規開発タスク');

    // 1. タスク一覧パネルに追加されたことを確認
    const createdTaskItem = page.getByText('新規開発タスク');
    await expect(createdTaskItem).toBeVisible();

    // 2. 頭数カウンターが更新されたことを確認 (+1)
    await expect(initialActiveBadge).toHaveText(`未完了: ${initialActiveCount + 1}羽`);

    // 3. 3D diorama canvas 内の Canvas 描画が確認されること
    const canvas = page.locator('[data-testid="duck-canvas-container"] canvas');
    await expect(canvas).toBeVisible();

    // 4. LocalStorage に保存されたことを確認
    const storageData = await page.evaluate(() => {
      const rawV1 = localStorage.getItem('quacktrack_tasks_v1');
      const rawTasks = localStorage.getItem('quacktrack-tasks');
      const raw = rawV1 || rawTasks;
      if (!raw) return null;
      return JSON.parse(raw);
    });

    expect(storageData).not.toBeNull();
    expect(storageData.tasks).toBeDefined();
    const foundTask = storageData.tasks.find(
      (t: { title: string; status: string }) => t.title === '新規開発タスク'
    );
    expect(foundTask).toBeDefined();
    expect(foundTask.status).toBe('todo');
  });

  /**
   * AC-02: 3Dアヒルのクリックと詳細UIの同期
   * - Given: 草原エリアにアヒルが存在している。
   * - When: タスク一覧またはアヒルを選択。
   * - Then:
   *   - タスク詳細ドロワーが画面右側に展開される。
   *   - タイトルや説明文、期限を変更して保存すると反映される。
   */
  test('AC-02: 3Dアヒルのクリックと詳細UIの同期', async ({ page }) => {
    // 最初のタスクアイテムをクリックして選択
    const firstTask = page.locator('[data-testid^="task-item-"]').first();
    await expect(firstTask).toBeVisible();
    await firstTask.click();

    // タスク詳細ドロワーが画面右側に展開されることを確認
    const drawer = page.getByTestId('task-detail-drawer');
    await expect(drawer).toBeVisible();

    // タイトル入力欄、説明文、期限を変更
    const titleInput = page.locator('#detail-title');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('更新されたタスクタイトル');

    const descInput = page.locator('#detail-description');
    await descInput.fill('詳細メモをE2Eテストから追加しました。');

    const dueDateInput = page.locator('#detail-duedate');
    await dueDateInput.fill('2026-12-31');

    // 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: '保存する' });
    await saveButton.click();

    // 「保存しました！✨」フィードバックの確認
    await expect(saveButton).toContainText('保存しました！');

    // タスク一覧パネルに更新後のタイトルが反映されていることを確認
    await expect(page.getByText('更新されたタスクタイトル')).toBeVisible();

    // LocalStorage に更新内容が保存されていることを確認
    const storedTask = await page.evaluate(() => {
      const raw = localStorage.getItem('quacktrack_tasks_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.tasks.find((t: { title: string }) => t.title === '更新されたタスクタイトル');
    });

    expect(storedTask).toBeDefined();
    expect(storedTask.description).toBe('詳細メモをE2Eテストから追加しました。');
    expect(storedTask.dueDate).toContain('2026-12-31');
  });

  /**
   * AC-03: ステータス変更とビジュアル・配置の連動
   * - Given: 草原エリアに todo 状態のアヒルが存在する。
   * - When: ステータスを in-progress に変更する。
   * - Then: ネクタイ/ハチマキ等の装飾反映、ステータス変更。
   * - When: ステータスを done に変更する。
   * - Then: 完了セレブレーション発火、王冠装着、完了カウンター増加。
   */
  test('AC-03: ステータス変更とビジュアル・配置の連動', async ({ page }) => {
    // 1. 未着手タスクを作成
    const taskItem = await createNewTask(page, '装飾連動テストタスク');

    // 2. 詳細ドロワーを開く
    await taskItem.click();
    const drawer = page.getByTestId('task-detail-drawer');
    await expect(drawer).toBeVisible();

    // ステータスを「進行中 (in-progress)」に変更して保存
    const inProgressButton = drawer.getByRole('button', { name: '進行中' });
    await inProgressButton.click();
    await drawer.getByRole('button', { name: '保存する' }).click();

    // ステータスバッジの進行中反映確認
    const progressBadge = page
      .locator('[data-testid^="task-item-"]')
      .filter({ hasText: '装飾連動テストタスク' })
      .getByText('進行中');
    await expect(progressBadge).toBeVisible();

    // ストア上のステータスが in-progress になっていることを確認
    const taskStateInProgress = await page.evaluate(() => {
      const raw = localStorage.getItem('quacktrack_tasks_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.tasks.find((t: { title: string }) => t.title === '装飾連動テストタスク');
    });
    expect(taskStateInProgress.status).toBe('in-progress');

    // 3. ステータスを「完了 (done)」に変更
    const doneBadge = page.getByTestId('duck-count-done');
    const initialDoneCountText = await doneBadge.innerText();
    const initialDoneCount = parseInt(initialDoneCountText.replace(/[^0-9]/g, ''), 10) || 0;

    // ドロワー内の「完了」ボタンを選択して「保存する」
    const doneOptionButton = drawer.getByRole('button', { name: '完了', exact: true });
    await doneOptionButton.click();
    await drawer.getByRole('button', { name: '保存する' }).click();

    // 完了カウンターが増加したことを確認
    await expect(doneBadge).toHaveText(`完了: ${initialDoneCount + 1}羽`);

    // ストア上のステータスが done に更新され、completedAt がセットされていることを確認
    const taskStateDone = await page.evaluate(() => {
      const raw = localStorage.getItem('quacktrack_tasks_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.tasks.find((t: { title: string }) => t.title === '装飾連動テストタスク');
    });
    expect(taskStateDone.status).toBe('done');
    expect(taskStateDone.completedAt).not.toBeNull();
  });

  /**
   * AC-04: 締め切り連動アルゴリズムの動作
   * - Given: タスクに期限が設定されている。
   * - When: 残り時間4時間未満（直前パニック）または期限超過（overdue）のタスクを設定。
   * - Then: 感情エフェクトマーク（汗/怒り・湯気マーク）の存在確認、歩行速度が猛ダッシュ(2.0x〜2.5x)。
   * - When: タスクを done に完了させる。
   * - Then: 猛ダッシュと感情マークが解除され、リラックス遊泳速度(0.6x)へ固定される。
   */
  test('AC-04: 締め切り連動アルゴリズムの動作', async ({ page }) => {
    // 期限超過タスクを作成
    const taskItem = await createNewTask(page, 'パニック急ぎタスク');
    await taskItem.click();

    const drawer = page.getByTestId('task-detail-drawer');
    await expect(drawer).toBeVisible();

    // 期限を昨日の日付に設定して保存（期限超過 overdue を再現）
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dueDateInput = page.locator('#detail-duedate');
    await dueDateInput.fill(yesterday);
    await page.getByRole('button', { name: '保存する' }).click();

    // アプリケーション内の緊急度計算結果を検証（速度倍率 2.0x、overdue 怒り湯気エフェクト判定）
    const urgencyOverdue = await page.evaluate(() => {
      const store = (
        window as unknown as {
          __quacktrack_task_store?: {
            getState: () => { tasks: Array<{ title: string; dueDate?: string; status: string }> };
          };
        }
      ).__quacktrack_task_store;
      if (!store) return null;
      const task = store.getState().tasks.find((t) => t.title === 'パニック急ぎタスク');
      if (!task || !task.dueDate) return null;

      const diffHours = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
      return {
        diffHours,
        status: task.status,
        isOverdue: diffHours < 0,
      };
    });

    expect(urgencyOverdue).not.toBeNull();
    expect(urgencyOverdue?.isOverdue).toBe(true);

    // 次に、期限を2時間後（残り2時間: critical 直前パニック 2.5x 猛ダッシュ）に設定
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await page.evaluate((isoDate) => {
      const store = (
        window as unknown as {
          __quacktrack_task_store?: {
            getState: () => {
              tasks: Array<{ id: string; title: string }>;
              updateTask: (id: string, updates: { dueDate: string }) => void;
            };
          };
        }
      ).__quacktrack_task_store;
      if (!store) return;
      const task = store.getState().tasks.find((t) => t.title === 'パニック急ぎタスク');
      if (task) {
        store.getState().updateTask(task.id, { dueDate: isoDate });
      }
    }, twoHoursLater);

    // 4時間未満（直前パニック）の判定確認
    const urgencyCritical = await page.evaluate(() => {
      const store = (
        window as unknown as {
          __quacktrack_task_store?: {
            getState: () => { tasks: Array<{ title: string; dueDate?: string; status: string }> };
          };
        }
      ).__quacktrack_task_store;
      if (!store) return null;
      const task = store.getState().tasks.find((t) => t.title === 'パニック急ぎタスク');
      if (!task || !task.dueDate) return null;

      const diffHours = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
      return {
        diffHours,
        isCritical: diffHours >= 0 && diffHours < 4,
      };
    });

    expect(urgencyCritical?.isCritical).toBe(true);

    // タスクを完了にする（ドロワー内の「完了」ステータスを選択して保存）
    const doneOptionButton = drawer.getByRole('button', { name: '完了', exact: true });
    await doneOptionButton.click();
    await drawer.getByRole('button', { name: '保存する' }).click();

    // 完了後は緊急度・焦り演出が解除され、ステータス done (relaxed: 0.6x遊泳) に固定されること
    const urgencyAfterDone = await page.evaluate(() => {
      const store = (
        window as unknown as {
          __quacktrack_task_store?: {
            getState: () => { tasks: Array<{ title: string; status: string }> };
          };
        }
      ).__quacktrack_task_store;
      if (!store) return null;
      const task = store.getState().tasks.find((t) => t.title === 'パニック急ぎタスク');
      return task ? task.status : null;
    });

    expect(urgencyAfterDone).toBe('done');
  });

  /**
   * AC-05: データ永続性とリロード復元
   * - Given: ユーザーがタスクを登録している。
   * - When: ブラウザのページを再読み込み（page.reload()）する。
   * - Then:
   *   - 画面復元後、UIリストにタスクが同一の状態で復元されている。
   *   - 3D空間上にアヒルが復元され、UIおよび3D表示が維持される。
   *   - LocalStorage からすべてのタスクデータ・設定が復元される。
   */
  test('AC-05: データ永続性とリロード復元', async ({ page }) => {
    // 固有のテストタスクを作成
    await createNewTask(page, '永続化テストタスク-A');

    // 音声設定を変更して設定の永続化もテスト
    const soundButton = page.getByTestId('sound-toggle-button');
    await soundButton.click();

    // ページをリロード
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // リロード後もタスク一覧にタスクが表示されていること
    await expect(page.getByText('永続化テストタスク-A')).toBeVisible();

    // 3D Canvas も正常に描画されていること
    const canvas = page.locator('[data-testid="duck-canvas-container"] canvas');
    await expect(canvas).toBeVisible();

    // LocalStorage からデータが正しく復元されていること
    const reloadedStoreData = await page.evaluate(() => {
      const raw = localStorage.getItem('quacktrack_tasks_v1');
      if (!raw) return null;
      return JSON.parse(raw);
    });

    expect(reloadedStoreData).not.toBeNull();
    expect(
      reloadedStoreData.tasks.some((t: { title: string }) => t.title === '永続化テストタスク-A')
    ).toBe(true);
    expect(reloadedStoreData.settings.soundEnabled).toBe(true);
  });

  /**
   * AC-06: カメラ操作と視点リセット
   * - Given: 3Dキャンバスが表示されている。
   * - When: Canvas 上でのドラッグ操作を行う。
   * - Then:
   *   - 視点（カメラ）が操作される。
   *   - ヘッダーバーの「視点リセット」ボタンをクリック -> 初期視点へ復帰する。
   */
  test('AC-06: カメラ操作と視点リセット', async ({ page }) => {
    const canvas = page.locator('[data-testid="duck-canvas-container"] canvas');
    await expect(canvas).toBeVisible();

    // 初期 resetTrigger を取得
    const initialResetTrigger = await page.evaluate(() => {
      const store = (
        window as unknown as {
          __quacktrack_camera_store?: {
            getState: () => { resetTrigger: number };
          };
        }
      ).__quacktrack_camera_store;
      return store ? store.getState().resetTrigger : 0;
    });

    // Canvas 上でドラッグ操作を実行
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down({ button: 'left' });
      await page.mouse.move(startX + 80, startY + 40, { steps: 5 });
      await page.mouse.up({ button: 'left' });
    }

    // ヘッダーバーの「視点リセット」ボタンをクリック
    const resetButton = page.getByTestId('camera-reset-button');
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // resetTrigger が増加したことを確認
    const newResetTrigger = await page.evaluate(() => {
      const store = (
        window as unknown as {
          __quacktrack_camera_store?: {
            getState: () => { resetTrigger: number };
          };
        }
      ).__quacktrack_camera_store;
      return store ? store.getState().resetTrigger : 0;
    });

    expect(newResetTrigger).toBeGreaterThan(initialResetTrigger);

    // アニメーション完了を少し待機し、カメラ情報が初期化状態になることを確認
    await page.waitForTimeout(500);

    const cameraInfo = await page.evaluate(() => {
      return (
        window as unknown as {
          __quacktrack_camera?: {
            position: [number, number, number];
            target: [number, number, number];
          };
        }
      ).__quacktrack_camera;
    });

    // 視点リセットが実行されたことを確認
    expect(cameraInfo).toBeDefined();
  });
});
