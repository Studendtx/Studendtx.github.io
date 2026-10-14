// Study monitor: updates row colours, credits, average and the progress bar
// whenever a grade is entered on the dashboard.
const PASSING_GRADE = 5.5;
const TOTAL_EC = 60;

function updateStudyMonitor() {
	const rows = document.querySelectorAll('.dashboard tbody tr');
	let earnedEc = 0;
	let gradeSum = 0;
	let gradeCount = 0;

	rows.forEach(function (row) {
		const input = row.querySelector('.grade-input');
		const ecCell = row.querySelector('.ec');
		if (!input || !ecCell) {
			return;
		}

		const ec = parseFloat(ecCell.textContent) || 0;
		const grade = parseFloat(input.value);

		row.classList.remove('passed', 'failed', 'pending');
		if (isNaN(grade)) {
			row.classList.add('pending');
			return;
		}

		gradeSum += grade;
		gradeCount++;

		if (grade >= PASSING_GRADE) {
			row.classList.add('passed');
			earnedEc += ec;
		} else {
			row.classList.add('failed');
		}
	});

	const progressEc = Math.min(earnedEc, TOTAL_EC);
	document.getElementById('progress').style.setProperty('--earned', progressEc);
	document.getElementById('earned').textContent = earnedEc + ' / ' + TOTAL_EC + ' EC';
	document.getElementById('total-ec').textContent = earnedEc + ' / ' + TOTAL_EC;
	document.getElementById('average').textContent =
		gradeCount > 0 ? (gradeSum / gradeCount).toFixed(1) : '--';
}

if (document.getElementById('progress')) {
	document.querySelectorAll('.grade-input').forEach(function (input) {
		input.addEventListener('input', updateStudyMonitor);
	});
	updateStudyMonitor();
}
