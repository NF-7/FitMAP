'use strict';

// QUERY SELECTORS

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const inputTemperature = document.querySelector('.form__input--temperature');
const deleteWorkouts = document.querySelector('.reset__workouts-all');
const sortWorkouts = document.querySelector('.sort__workouts-all');

// REFACTORED CODE

// IMPROVED ALERTS

const errorGeoAlert = {
  icon: 'error',
  title: 'ERROR',
  text: 'Unfortunately, we cannot access your location. Please turn on location services in your web browser or your OS.',
  animation: true,
  confirmButtonText: 'OK',
  backdrop: false,
};

const errorRunningAlert = {
  icon: 'error',
  title: 'ERROR',
  text: 'Unfortunately, you cannot use negative numbers or letters in those fields!',
  confirmButtonText: 'OK',
  backdrop: false,
  timer: 3000,
  timerProgressBar: true,
};

const confirmButtonDelete = {
  icon: 'info',
  title: 'Are you sure?',
  text: 'Deleting the data will result in irreversible data loss!',
  confirmButtonText: 'DELETE',
  backdrop: false,
  timer: 5000,
  timerProgressBar: true,
};

const errorCyclingAlert = {
  icon: 'error',
  title: 'ERROR',
  text: 'Unfortunately, you cannot use negative numbers or letters in those fields. Please use positive numbers as negative numbers are only permitted in elevation field!',
  confirmButtonText: 'OK',
  backdrop: false,
  timer: 3000,
  timerProgressBar: true,
};

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coordinates, distance, duration) {
    // this.date = ...; // ES6
    // this.id = ...;
    this.coordinates = coordinates; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in minutes
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coordinates, distance, duration, cadence) {
    super(coordinates, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coordinates, distance, duration, elevationGain) {
    super(coordinates, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// class Swimming extends Workout {
//   type = 'swimming';
//   constructor(coordinates, distance, duration, temperature) {
//     super(coordinates, distance, duration);
//     this.temperature = temperature;
//     this._setDescription();
//   }

//   calcSwim() {
//     // min/km
//     this.swim = this.duration / this.distance;
//     return this.swim;
//   }
// }

class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent; // PRIVATE INSTANCE PROPERTIES
  workouts = [];

  constructor() {
    // GETTING USER GEO POSITION
    this._getPosition();

    // GET DATA FROM LOCAL STORAGE
    this._getLocalStorage();

    // EVENT HANDLERS
    form.addEventListener('submit', this._newWorkout.bind(this)); // binding this to the class not the form

    // inputType.addEventListener('change', this._toggleElevation);

    inputType.addEventListener('change', this._toggleElevation);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // DELETE WORKOUTS

    deleteWorkouts.addEventListener('click', function () {
      Swal.fire(confirmButtonDelete).then(result => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
          app.reset();
        } else if (result.isDenied) {
          return;
        }
      });
    });

    // SORT WORKOUTS
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          Swal.fire(errorGeoAlert);
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // USING LEAFLET MAP API

    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoomLevel); // zoom level

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright/">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // HANDLING CLICKS ON MAP
    this.#map.on('click', this._showForm.bind(this));

    this.workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // EMPTY INPUTS
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevation() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // _toggleTemperature() {
  //   inputTemperature
  //     .closest('.form__row')
  //     .classList.toggle('form__row--hidden');
  //   inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  // }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const positiveNumbers = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // GET DATA FROM FORM

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // IF ACTIVITY RUNNING, CREATE RUNNING OBJECT

    if (type === 'running') {
      const cadence = +inputCadence.value;
      // CHECK IF DATA IS VALID - helper function
      if (
        !validInputs(distance, duration, cadence) ||
        !positiveNumbers(distance, duration, cadence)
      )
        return Swal.fire(errorRunningAlert);

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // IF ACTIVITY CYCLING, CREATE CYCLING OBJECT

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // CHECK IF DATA IS VALID - if statement
      if (
        !Number.isFinite(distance) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(elevation) ||
        !positiveNumbers(distance, duration)
      )
        return Swal.fire(errorCyclingAlert);

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // ADD NEW OBJECT TO ARRAY OF WORKOUTS

    this.workouts.push(workout);
    // console.log(workout);

    // RENDER WORKOUT ON MAP AS MARKER

    this._renderWorkoutMarker(workout);

    // RENDER WORKOUT ON LIST

    this._renderWorkout(workout);

    // HIDE FORM & CLEAR INPUT FIELDS

    this._hideForm();

    // SAVE TO LOCAL STORAGE

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coordinates)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: true,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
          <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;

    if (workout.type === 'cycling')
      html += ` 
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coordinates, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // USING THE PUBLIC INTERFACE

    // workout.click(); - this method was used to demonstrate how prototypal inheritance is lost when saving and getting data back from LocalStorage API
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.workouts = data;

    this.workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  // sort() {
  //   app.workouts
  //     .slice()
  //     .sort((w1, w2) => w1.type.charCodeAt(0) - w2.type.charCodeAt(0));
  // }
}

const app = new App();

///// CHALLENGES TO IMPROVE THE APP /////

// 1. EDIT WORKOUTS

// 2. DELETE A WORKOUT

// 3. DELETE ALL WORKOUTS FROM THE UI --> DONE

// 4. SORT WORKOUTS

// 5. RE-BUILD RUNNING AND CYCLING OBJECTS FROM LOCAL STORAGE TO HAVE PROTOTYPAL INHERITANCE

// 6. MORE REALISTIC ERROR AND CONFIRMATION MESSAGES --> DONE (with SweetAlert2);

// 7. ABILITY TO POSITION THE MAP TO SHOW ALL WORKOUTS (very hard) --> leaflet library documentation

// 8. ABILITY TO DRAW LINES AND SHAPES INSTEAD OF JUST POINTS (very hard) --> leaflet library documentation

// 9. GEOCODE LOCATION FROM COORDINATES (very hard) --> only after Asynchonous JS section

// 10. DISPLAY WEATHER DATA FOR WORKOUT (very hard) --> only after Asynchonous JS section
