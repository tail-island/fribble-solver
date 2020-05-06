import fs  from 'fs';
import ejs from 'ejs';

function readAnswer(questionText, answerText) {
    const question = JSON.parse(questionText);
    const answer   = JSON.parse(answerText);

    const getDescendants = task => {
        const children = task.childIds ? question.tasks.filter(child => task.childIds.includes(child.id)) : [];

        return children.concat(children.flatMap(getDescendants));
    };

    const isLeaf = task => getDescendants(task).length == 0;
    const isNode = task => !isLeaf(task);

    const setStartAndEndDayToNode = task => {
        if (!isNode(task)) {
            return;
        }

        const descendants = getDescendants(task).filter(isLeaf);

        task.startDay = descendants.length > 0 ? Math.min(...descendants.map(descendant => descendant.startDay)) : -1;
        task.endDay   = descendants.length > 0 ? Math.max(...descendants.map(descendant => descendant.endDay  )) : -1;
    };

    for (const taskSchedule of answer) {
        const task = question.tasks.find(task => task.id === taskSchedule.taskId);

        task.member   = question.members.find(member => member.id === taskSchedule.memberId);
        task.startDay = taskSchedule.startDay;
        task.endDay   = taskSchedule.endDay;
    }

    for (const task of question.tasks) {
        setStartAndEndDayToNode(task);
    }

    return question;
}

fs.writeFileSync(process.stdout.fd, ejs.render(fs.readFileSync('./chart.ejs', 'utf-8'), readAnswer(fs.readFileSync(process.argv[2]), fs.readFileSync(process.argv[3]))));
