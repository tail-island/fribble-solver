export function solve(question) {
    // タスクの実行順序の、可能な全ての組み合わせを返すジェネレーター関数
    function* getTaskOrders(orderedTasks = []) {
        // 深さ優先探索の終了条件です。全てのタスクが順序に組み込まれたら、探索を終了します
        if (orderedTasks.length === question.tasks.length) {
            yield orderedTasks;
            return;
        }

        // まだ順序に組み込まれていないタスクを組み込みます
        for (const task of question.tasks.filter(task => !orderedTasks.includes(task))) {
            // ただし、全ての先行タスクが順序に組み込まれていない場合はまだ組み込めないので、コンティニューします
            if (!task.predecessors.every(predecessor => orderedTasks.includes(predecessor))) {
                continue;
            }

            // 再帰呼び出しして、深さ優先探索します
            yield* getTaskOrders(orderedTasks.concat([task]));
        }
    }

    // メンバーのタスクへのアサインの、可能な全ての組み合わせを返すジェネレーター関数
    function* getMemberAssigns() {
        // memberの数をタスクの数乗した数の組み合わせ回のループを実行します。たとえばmemberの数が10でタスクの数が3なら10 ** 3の100となります
        outerLoop: for (let i = 0; i < question.members.length ** question.tasks.length; ++i) {
            const assign = [];

            for (let j = 0; j < question.tasks.length; ++j) {
                // iをmembers.lengthのj乗で除算した商の、members.lengthの剰余番目のメンバーを選びます。たとえばmemberの数が10なら、10 ** 0 = 1、10 ** 1 = 10, 10 ** 2 = 100なので、ちょうどj桁目の値を取得する処理となります
                const member = question.members[Math.floor(i / (question.members.length ** j)) % question.members.length];

                // スキルを持っていない場合は、アサインできないのでアサインをやめてコンティニューします
                if (!question.tasks[j].skills.every(skill => member.skills.includes(skill))) {
                    continue outerLoop;
                }

                assign.push(member);
            }

            yield new Map(question.tasks.map((task, i) => [task, assign[i]]));
        }

        // 深さ優先探索で書いたらout of memoryになったので、こんな感じにしてみました
    }

    // タスクに担当と開始日と終了日を割り当てて、スケジュールを作成します
    function createSchedule(taskOrder, memberAssign) {
        const result = [];

        for (const task of taskOrder) {
            const member = memberAssign.get(task);

            // 先行タスクとメンバーにアサインされたタスクの配列
            const taskSchedules = Array.from(new Set(result.filter(taskSchedule => task.predecessors.includes(taskSchedule.task)).concat(result.filter(taskSchedule => taskSchedule.member === member))));

            // 先行タスクとメンバーにアサインされたタスクの終了日の翌日の最も大きい日が、タスク開始可能日となります
            const startDay = taskSchedules.length > 0 ? Math.max(...taskSchedules.map(taskSchedule => taskSchedule.endDay + 1)) : 0;

            result.push({'task': task, 'member': member, 'startDay': startDay, 'endDay': startDay + task.duration - 1});
        }

        return result;
    }

    let bestSchedule = null;
    let bestEndDay = Number.MAX_SAFE_INTEGER;

    for (const taskOrder of getTaskOrders()) {  // 全てのタスク実行順序で……
        for (const memberAssign of getMemberAssigns()) {  // 全てのアサインで……
            const schedule = createSchedule(taskOrder, memberAssign);  // スケジュールを生成して……
            const endDay = Math.max(...schedule.map(scheduledTask => scheduledTask.endDay));  // 終了日を取得します

            if (endDay < bestEndDay) {  // 最も終了日が早いスケジュールだけを残します
                bestEndDay   = endDay;
                bestSchedule = schedule;
            }
        }
    }

    return bestSchedule;
}
