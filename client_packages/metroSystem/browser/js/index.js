var Metro = new Vue({
    el: ".Metro",
    data: {
        active: true,
        ticketPrice: 0,
		routeNumber: 0,
        currentStation: 0,
        selectedStation: null,
		stations: []
    },
    methods:{
        open(price, currentStationId, routeNumber, stations){
            this.ticketPrice = price;
			this.routeNumber = routeNumber;
            this.currentStation = currentStationId;
			this.stations = stations;
        },
        exit() {
            this.active = false;
            mp.trigger("metro::close_menu");
        },
        selectStation(station) {
            if (station.Id != this.currentStation) {
                this.selectedStation = station;
            }
        },
        buyTicket() {
            if (this.selectedStation) {
                mp.trigger("metro::buy_ticket_trigger", this.selectedStation.Id);
            }
        }
    }
});