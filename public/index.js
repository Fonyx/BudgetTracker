let transactions = [];
let myChart;

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
  console.log(`Dev testing, skipping network, straight to indexedDB save`);
  saveRecord(transaction);

  getRecord();
  
  // // also send to server
  // fetch("/api/transaction", {
  //   method: "POST",
  //   body: JSON.stringify(transaction),
  //   headers: {
  //     Accept: "application/json, text/plain, */*",
  //     "Content-Type": "application/json"
  //   }
  // })
  // .then(response => {    
  //   return response.json();
  // })
  // .then(data => {
  //   if (data.errors) {
  //     errorEl.textContent = "Missing Information";
  //   }
  //   else {
  //     // clear form
  //     nameEl.value = "";
  //     amountEl.value = "";
  //   }
  // })
  // .catch(err => {
  //   // fetch failed, so save in indexed db
  //   console.log(`Failed to post transaction, storing for later`)
  //   saveRecord(transaction);

  //   // clear form
  //   nameEl.value = "";
  //   amountEl.value = "";
  // });
}

async function saveRecord(data){

  console.log('transaction being parsed in is: ', data);
  
  // get the database connection
  const dbRequest = getIndexDBConnection();
  
  // if successful, select the db as the request result, open transaction, and add the transaction details to the object store with a transactionId as the key
  dbRequest.onsuccess = () => {
    const db = dbRequest.result;
    const transaction = db.transaction(["offlineTransactions"], "readwrite");
    const transactionStore = transaction.objectStore("offlineTransactions");
    // const transIndex = transactionStore.index("transactionId"); for cursor work returning all
    let randomIndex = Math.floor(Math.random()*10000);

    let transObj = transactionStore.add({
      transactionId: randomIndex,
      ...data
    });

    console.log('transObj after saving in db: ', transObj);

  }
}

/**
 * Function that gets a single transaction or all transactions if id not passed
 * @param {string} id 
 * @return {list}  result
 */
async function getRecord(id){
  let dbRequest = getIndexDBConnection();

  dbRequest.onsuccess = () => {
    const db = dbRequest.result;
    let transaction = db.transaction(["offlineTransactions"], "readwrite");
    let transactionStore = transaction.objectStore('offlineTransactions');

    var result = [];

    // case for getting a single record with id
    if(id){
      const getOneRequest = transactionStore.get(id);
      getOneRequest.onsuccess = () => {
        console.log(getOneRequest.result);
        result.push(getOneResult.result);
      }
    // case for getting all records
    } else {
      const getAllRequest = transactionStore.getAll();
      getAllRequest.onsuccess = () => {
        console.log(getAllRequest.result);
        result = getAllRequest.result;
      }
    }
    return result;
  }
}


function getIndexDBConnection(){
    const dbRequest = window.indexedDB.open("transactionDatabase", 1);

    // create the database object store structure - equivalent to a collection
    dbRequest.onupgradeneeded = event => {
      console.log(`Upgrade needed for database`);
      const db = event.target.result;
      const transactionStore = db.createObjectStore("offlineTransactions", {keyPath: "transactionId"});
      // Creates a statusIndex that we can query on.
      transactionStore.createIndex("transactionId", "id"); 
    }

    return dbRequest;
}

getIndexDBConnection();

document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};
