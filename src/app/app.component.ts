import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { interval, Subscription } from 'rxjs';

interface Port {
  portId: number;
  deviceNo: number;
  interface: string;
  portStatus: string;
  time: Date;
}

interface System {
  systemId: number;
  deviceNo: number;
  time: Date;
  sysDescr: string;
  sysName: string;
  sysUpTime: string;
  sysLocation: string;
  sysServices: number;
}
interface Syslog {
  syslogId: number;
  ip: string;
  pri: number;
  timeStamp: Date;
  hostName: string;
  message: string;
}
interface Arayuz {
  interfaceId: number;
  deviceNo: number;
  ifIndex: number;
  ifDescr: string;
  ifType: number;
  ifMtu: number;
  ifSpeed: number;
  ifPhysAddress: string;
  ifAdminStatus: number;
  ifOperStatus: number;
  ifLastChange: string;
}

// PROTOCOL_CONFIG nesnesinin türünü Record<string, string[]> olarak belirtiyoruz
const PROTOCOL_CONFIG: Record<string, string[]> = {
  TCP: [
    'tcpRtoMin',
    'tcpRtoMax',
    'tcpMaxConn',
    'tcpActiveOpens',
    'tcpPassiveOpens',
    'tcpAttemptFails',
    'tcpEstabResets',
    'tcpCurrEstab',
    'tcpInSegs',
    'tcpOutSegs',
    'tcpRetransSegs',
    'tcpConnTable',
    'tcpInErrs',
    'tcpOutRsts',
  ],
  UDP: [
    'udpInDatagrams',
    'udpNoPorts',
    'udpInErrors',
    'udpOutDatagrams',
    'udpTable',
  ],
  SNMP: [
    'snmpInPkts',
    'snmpOutPkts',
    'snmpInBadVersions',
    'snmpInBadCommunityNames',
    'snmpInBadCommunityUses',
    'snmpInTooBigs',
    'snmpInNoSuchNames',
    'snmpInBadValues',
    'snmpInReadOnlys',
    'snmpInGenErrs',
    'snmpInTotalReqVars',
    'snmpInTotalSetVars',
    'snmpInGetRequests',
    'snmpInGetNexts',
    'snmpInSetRequests',
    'snmpInGetResponses',
    'snmpOutTooBigs',
    'snmpOutNoSuchNames',
    'snmpOutBadValues',
    'snmpOutGenErrs',
    'snmpOutGetRequests',
    'snmpOutGetNexts',
    'snmpOutSetRequests',
    'snmpOutGetResponses',
    'snmpOutTraps',
    'snmpEnableAuthenTraps',
  ],
  IP: [
    'ipForwarding',
    'ipDefaultTTL',
    'ipInReceives',
    'ipInHdrErrors',
    'ipInAddrErrors',
    'ipForwDatagrams',
    'ipInUnknownProtos',
    'ipInDiscards',
    'ipInDelivers',
    'ipOutRequests',
    'ipOutDiscards',
    'ipOutNoRoutes',
    'ipReasmTimeout',
    'ipReasmReqds',
    'ipReasmOKs',
    'ipReasmFails',
    'ipFragOKs',
    'ipFragFails',
    'ipFragCreates',
    'ipAddrTable',
    'ipRouteTable',
    'ipNetToMediaTable',
    'ipRoutingDiscards',
    'lastBitMask',
  ],
  ICMP: [
    'icmpInMsgs',
    'icmpInErrors',
    'icmpInDestUnreachs',
    'icmpInTimeExcds',
    'icmpInParmProbs',
    'icmpInSrcQuenchs',
    'icmpInRedirects',
    'icmpInEchos',
    'icmpInEchoReps',
    'icmpInTimestamps',
    'icmpInTimestampReps',
    'icmpInAddrMasks',
    'icmpInAddrMaskReps',
    'icmpOutMsgs',
    'icmpOutErrors',
    'icmpOutDestUnreachs',
    'icmpOutTimeExcds',
    'icmpOutParmProbs',
    'icmpOutSrcQuenchs',
    'icmpOutRedirects',
    'icmpOutEchos',
    'icmpOutEchoReps',
    'icmpOutTimestamps',
    'icmpOutTimestampReps',
    'icmpOutAddrMasks',
    'icmpOutAddrMaskReps',
  ],
  INTERFACE: [
    'ifInOctets',
    'ifInUcastPkts',
    'ifInNUcastPkts',
    'ifInDiscards',
    'ifInErrors',
    'ifInUnknownProtos',
    'ifOutOctets',
    'ifOutUcastPkts',
    'ifOutNUcastPkts',
    'ifOutDiscards',
    'ifOutErrors',
    'ifOutQLen',
    'ifSpecific',
  ],
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ChartModule,
    HttpClientModule,
    TableModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  ports: Port[] = [];
  system: System | null = null; // Tek bir sistem nesnesi
  syslogData: Syslog[] = [];
  interfaceTable: Arayuz[] = [];
  chartOptions: any = {
    legend: {
      position: 'bottom',
    },
  };

  charts: {
    id: number;
    chartData: any;
    datasets: any[];
    controllers: string[];
  }[] = [];
  chartCounter: number = 0;
  baseUrl: string = 'https://localhost:7014/api/';
  updateInterval: number = 600000; // 60 saniye
  subscriptions: { [key: string]: Subscription } = {};

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.getPortsByDeviceNo(10); // Örnek olarak 10 numaralı cihaz
    this.getSystemByDeviceNo(10); // Örnek olarak 10 numaralı cihaz
    this.getInterfaceByDeviceNo();
  }

  ngOnDestroy() {
    this.clearAllSubscriptions();
  }

  getInterfaceByDeviceNo() {
    this.http.get<Arayuz[]>(`${this.baseUrl}interface`).subscribe((data) => {
      this.interfaceTable = data;
    });
  }
  getSyslogByDeviceNo() {
    this.http.get<Syslog[]>(`${this.baseUrl}syslog`).subscribe(
      (data) => {
        console.log('Syslog data:', data); // Hata ayıklama için log ekleyin
        this.syslogData = data;
      },
      (error) => {
        console.error('Error fetching syslog data:', error);
      }
    );
  }

  addSyslogTable() {
    // Eğer mevcut tablo varsa, onu kaldır
    if (this.syslogData.length > 0) {
      this.removeSyslogTable();
    }

    // Mevcut grafik varsa, onu kaldır
    if (this.charts.length > 0) {
      this.removeChart(0);
    }

    // Syslog tablosunu eklemek için HTML tarafına butona basıldığında
    this.getSyslogByDeviceNo(); // Örnek olarak 10 numaralı cihaz
  }
  removeSyslogTable() {
    // Tabloyu temizlemek için syslog verilerini boş bir diziye atanıyor
    this.syslogData = [];
  }
  getPortsByDeviceNo(deviceNo: number) {
    this.http
      .get<Port[]>(`${this.baseUrl}port/${deviceNo}`)
      .subscribe((data) => {
        this.ports = data;
      });
  }

  getSystemByDeviceNo(deviceNo: number) {
    this.http.get<System>(`${this.baseUrl}system/${deviceNo}`).subscribe(
      (data) => {
        console.log('System data:', data); // Hata ayıklama için log ekleyin
        this.system = data;
      },
      (error) => {
        console.error('Error fetching system data:', error);
      }
    );
  }

  addChart(controllerLabels: string[]) {
    // Eğer mevcut grafik varsa, onu kaldır
    if (this.charts.length > 0) {
      this.removeChart(0);
    }

    // Mevcut syslog tablosu varsa, onu kaldır
    this.removeSyslogTable();

    // Yeni grafik ekle
    const newChartId = this.chartCounter++;
    const newChart = {
      id: newChartId,
      chartData: this.initChartData(),
      datasets: [],
      controllers: controllerLabels,
    };

    this.charts.push(newChart);

    controllerLabels.forEach((controller) => {
      this.fetchData(newChartId, controller);
      const subscription = interval(this.updateInterval).subscribe(() => {
        this.fetchData(newChartId, controller);
      });
      this.subscriptions[newChartId + '_' + controller] = subscription;
    });
  }

  removeChart(index: number) {
    const chart = this.charts[index];
    if (!chart) return;

    // Grafiği kaldır
    this.charts.splice(index, 1);

    // İlgili tüm abonelikleri iptal et
    chart.controllers.forEach((controller) => {
      const subscriptionKey = chart.id + '_' + controller;
      if (this.subscriptions[subscriptionKey]) {
        this.subscriptions[subscriptionKey].unsubscribe();
        delete this.subscriptions[subscriptionKey];
      }
    });
  }

  initChartData() {
    return {
      labels: [],
      datasets: [],
    };
  }

  fetchData(chartId: number, protocol: string) {
    const chart = this.charts.find((chart) => chart.id === chartId);
    if (!chart) return;

    this.http.get<any[]>(`${this.baseUrl}${protocol}`).subscribe((data) => {
      const config = PROTOCOL_CONFIG[protocol.toUpperCase()];

      const datasets = config.map((key) => {
        return {
          label: key,
          data: data.map((item) => parseInt(item[key], 10)),
          fill: false,
          hidden: false,
          borderColor: this.getRandomColor(),
        };
      });

      const labels = data.map((item) => new Date(item.time).toLocaleString());

      this.updateDataset(chart, datasets, labels);
    });
  }

  updateDataset(
    chart: {
      id: number;
      chartData: any;
      datasets: any[];
      controllers: string[];
    },
    datasets: any[],
    labels: string[]
  ) {
    chart.datasets = datasets;

    // Güncellenmiş verileri chartData'ya aktar
    chart.chartData = {
      labels: labels,
      datasets: chart.datasets,
    };
  }

  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  clearAllSubscriptions() {
    Object.keys(this.subscriptions).forEach((key) => {
      this.subscriptions[key].unsubscribe();
      delete this.subscriptions[key];
    });
  }
}
