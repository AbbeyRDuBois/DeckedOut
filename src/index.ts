// index.ts
import { EntryController } from "./entry/entry-controller";
import { EntryModel } from "./entry/entry-model";
import { EntryView } from "./entry/entry-view";
import "./styles.css";

const model = new EntryModel();
const view = new EntryView();
const controller = new EntryController(model, view);

controller.init();
