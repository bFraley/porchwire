import { Component, OnInit } from '@angular/core';
import { Peer } from '../peer';

@Component({
  selector: 'app-peer',
  templateUrl: './peer.component.html',
  styleUrls: ['./peer.component.scss']
})

export class PeerComponent implements OnInit {
  peer: Peer = {
    peerId: String(Math.floor(Math.random()*10000))
  };

  constructor() { }
  ngOnInit() {}

}
