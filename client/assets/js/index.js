let transactions = [];
let myChart;
let db;
let budgetVersion = 2;

const request = indexedDB.open("transactionDatabase", budgetVersion || 1);

request.onupgradeneeded = e => {

  console.log('Upgrade needed in IndexDB');

  // get the old and new versions of the database, fall back on the current version of the db for when newVersion is not defined. This is the case when the initial database is created using an update
  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  // update the global database reference since the version was updated
  db = e.target.result;

  // if there are no object stores in the database, create a new one for offline transactions
  if(db.objectStoreNames.length === 0){
    db.createObjectStore("offlineTransactions", { autoIncrement: true})
  }
}

request.onerror = (e) => {
  console.error(`The database request raised an error ${e.target.errorCode}`);
}

request.onsuccess = async (e) => {
  console.log('Successfully connected to network database services')
  // update the global database reference
  db = e.target.result

  // Check if app is online before reading from db
  if (navigator.onLine) {
    await syncDatabase();
  }
}

async function resetUi(){
  console.log('resetting ui');
  fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;
  
    populateTotal();
    populateTable();
    populateChart();
  });
}

async function saveTransaction(data){

  console.log('transaction being parsed in is: ', data);

  const transaction = db.transaction(["offlineTransactions"], "readwrite");

  const transactionStore = transaction.objectStore("offlineTransactions");

  transactionStore.add(data)

  console.log('transaction stored in indexDB');


  // After adding to local, check if backend is available, then call sync
  if (navigator.onLine) {
    await syncDatabase();
  }
  
}

async function syncDatabase(){
  console.log('Synchronizing database');

  // Open a transaction for the offlineTransactions store, read only
  let transaction = db.transaction(['offlineTransactions'], 'readonly');

  // access your BudgetStore object
  const store = transaction.objectStore('offlineTransactions');

  // Get all records from store and set to a variable
  const getAllTransactions = store.getAll();

  // If the request was successful
  getAllTransactions.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAllTransactions.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAllTransactions.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then(async (response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to offlineTransaction with read and write since we are deleting the contents
            transaction = db.transaction(['offlineTransactions'], 'readwrite');

            const replacementStore = transaction.objectStore('offlineTransactions');

            console.log('Cleared local database');
            replacementStore.clear();
             // re call database entries from backend and re render ui
            resetUi();
          }
        });
    }
  };
}

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();

  // save to local database every time ignoring internet
  saveTransaction(transaction);
}

document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};

// initial loading from network and setup of ui
resetUi();

// Listen for app coming back online then sync local transactions
window.addEventListener('online', syncDatabase);